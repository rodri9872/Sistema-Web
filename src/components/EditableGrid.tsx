"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellKeyDownEvent,
  type CellValueChangedEvent,
  type ColDef,
  type DataTypeDefinitions,
  type Column,
  type GridApi,
  type GridReadyEvent,
  type IRowNode,
} from "ag-grid-community";
import { AG_GRID_LOCALE_ES } from "@ag-grid-community/locale";
import { supabase } from "@/lib/supabase/client";

ModuleRegistry.registerModules([AllCommunityModule]);

const excelTheme = themeQuartz.withParams({
  accentColor: "#16a34a",
  columnBorder: true,
  headerColumnBorder: true,
  rowBorder: true,
  wrapperBorderRadius: 6,
  fontSize: 13,
  rowHeight: 34,
  headerHeight: 36,
  oddRowBackgroundColor: "#fafafa",
});

type Row = Record<string, unknown> & { id: number | string };

/** Acepta 21/11/2026, 21-11-26 o 2026-11-21 y devuelve 2026-11-21 */
function parseDate(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

// Fechas en formato dd/mm/aaaa (se guardan como aaaa-mm-dd)
const dataTypes: DataTypeDefinitions<Row> = {
  dateString: {
    baseDataType: "dateString" as const,
    extendsDataType: "dateString" as const,
    valueParser: (p: { newValue?: string | null }) => parseDate(p.newValue ?? ""),
    valueFormatter: (p: { value?: string | null }) => (p.value ? p.value.slice(0, 10).split("-").reverse().join("/") : ""),
    dataTypeMatcher: (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
    dateParser: (v: string | undefined) => {
      const iso = v ? parseDate(v) : null;
      if (!iso) return undefined;
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, m - 1, d);
    },
    dateFormatter: (d: Date | undefined) =>
      d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined,
  },
};

export type EditableGridProps = {
  /** Tabla de Supabase */
  table: string;
  columns: ColDef[];
  /** Valores por defecto de una fila nueva */
  newRow?: () => Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  /** Filtro externo (botones "Solo mías", "Hoy", etc.) */
  externalFilter?: (row: Row) => boolean;
  toolbar?: React.ReactNode;
  height?: number | string;
  canAdd?: boolean;
  canDelete?: boolean;
  exportName?: string;
  /** Avisa cuando cambian los datos (para refrescar listas en otras pantallas) */
  onChange?: (rows: Row[]) => void;
  /** Estirar las columnas para ocupar todo el ancho (tablas con pocas columnas) */
  fit?: boolean;
};

export default function EditableGrid({
  table,
  columns,
  newRow = () => ({}),
  orderBy = { column: "id", ascending: false },
  externalFilter,
  toolbar,
  height = "calc(100vh - 210px)",
  canAdd = true,
  canDelete = true,
  exportName,
  onChange,
  fit = false,
}: EditableGridProps) {
  const apiRef = useRef<GridApi<Row> | null>(null);
  const reverting = useRef(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [showCols, setShowCols] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi<Row> | null>(null);
  const [, force] = useState(0);
  const storageKey = `grilla:${table}`;
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), error ? 5000 : 1500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase()
      .from(table)
      .select("*")
      .order(orderBy.column, { ascending: orderBy.ascending ?? false });
    if (error) flash("No se pudieron cargar los datos: " + error.message, true);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table, orderBy.column, orderBy.ascending, flash]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    apiRef.current?.onFilterChanged();
  }, [externalFilter]);

  const notify = () => {
    const all: Row[] = [];
    apiRef.current?.forEachNode((n) => n.data && all.push(n.data));
    onChangeRef.current?.(all);
  };

  const defaultColDef = useMemo<ColDef>(
    () => ({
      editable: true,
      filter: true,
      floatingFilter: false,
      sortable: true,
      resizable: true,
      minWidth: 80,
      ...(fit ? { flex: 1 } : { width: 150 }),
    }),
    [fit],
  );

  // ---- Guardar cada celda editada ----
  const onCellValueChanged = async (e: CellValueChangedEvent<Row>) => {
    if (reverting.current) return;
    const field = e.colDef.field;
    if (!field || !e.data) return;
    let value: unknown = e.newValue;
    if (value === "" || value === undefined) value = null;
    const payload = field.startsWith("custom.") ? { custom: e.data.custom ?? {} } : { [field]: value };
    const { error } = await supabase().from(table).update(payload).eq("id", e.data.id);
    if (error) {
      reverting.current = true;
      e.node.setDataValue(e.column, e.oldValue);
      reverting.current = false;
      flash("No se guardó: " + error.message, true);
    } else {
      flash("Guardado ✓");
      notify();
    }
  };

  // ---- Agregar fila ----
  const addRow = async () => {
    const { data, error } = await supabase().from(table).insert(newRow()).select().single();
    if (error) return flash("No se pudo agregar: " + error.message, true);
    const api = apiRef.current;
    if (!api) return;
    api.applyTransaction({ add: [data as Row], addIndex: 0 });
    const firstEditable = api.getAllDisplayedColumns().find((c) => c.getColDef().editable !== false && c.getColDef().field);
    if (firstEditable) {
      api.ensureIndexVisible(0);
      api.setFocusedCell(0, firstEditable);
      api.startEditingCell({ rowIndex: 0, colKey: firstEditable });
    }
    notify();
  };

  // ---- Borrar filas seleccionadas ----
  const deleteSelected = async () => {
    const api = apiRef.current;
    if (!api) return;
    const sel = api.getSelectedRows();
    if (!sel.length) return;
    if (!window.confirm(`¿Borrar ${sel.length} fila(s)? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase()
      .from(table)
      .delete()
      .in(
        "id",
        sel.map((r) => r.id),
      );
    if (error) return flash("No se pudo borrar: " + error.message, true);
    api.applyTransaction({ remove: sel });
    setSelectedCount(0);
    flash(`${sel.length} fila(s) borradas`);
    notify();
  };

  // ---- Columnas: recordar ancho, orden y columnas ocultas ----
  const saveState = () => {
    const api = apiRef.current;
    if (!api) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(api.getColumnState()));
    } catch {}
  };
  const onGridReady = (e: GridReadyEvent<Row>) => {
    apiRef.current = e.api;
    setGridApi(e.api);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) e.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
    } catch {}
    force((n) => n + 1);
  };
  const resetColumns = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    apiRef.current?.resetColumnState();
    force((n) => n + 1);
  };

  // ---- Copiar / pegar como en Excel (también varias celdas desde Excel) ----
  const onCellKeyDown = async (e: CellKeyDownEvent<Row>) => {
    const ev = e.event as KeyboardEvent | undefined;
    const api = apiRef.current;
    if (!ev || !api || api.getEditingCells().length) return;
    const mod = ev.ctrlKey || ev.metaKey;
    const key = ev.key.toLowerCase();

    if (mod && key === "c") {
      const text = e.column.getColDef().valueFormatter
        ? api.getCellValue({ rowNode: e.node, colKey: e.column, useFormatter: true })
        : e.value;
      try {
        await navigator.clipboard.writeText(text == null ? "" : String(text));
        flash("Copiado");
      } catch {}
      return;
    }

    if (mod && key === "v") {
      let text = "";
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return flash("El navegador no permitió leer el portapapeles", true);
      }
      const lines = text.replace(/\r/g, "").split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
      const cols = api.getAllDisplayedColumns();
      const startCol = cols.indexOf(e.column as Column);
      const startRow = e.rowIndex ?? 0;
      lines.forEach((line, r) => {
        const node = api.getDisplayedRowAtIndex(startRow + r) as IRowNode<Row> | undefined;
        if (!node) return;
        line.split("\t").forEach((cell, c) => {
          const col = cols[startCol + c];
          const def = col?.getColDef();
          if (!col || !def?.field || def.editable === false) return;
          let value: unknown = cell;
          if (def.valueParser && typeof def.valueParser === "function") {
            value = def.valueParser({
              newValue: cell,
              oldValue: node.data ? api.getCellValue({ rowNode: node, colKey: col }) : null,
              node,
              data: node.data,
              colDef: def,
              column: col,
              api,
              context: undefined,
            });
          } else if (def.cellDataType === "number") {
            const n = Number(cell.replace(/\./g, "").replace(",", "."));
            value = cell.trim() === "" ? null : Number.isNaN(n) ? null : n;
          } else if (def.cellDataType === "dateString") {
            value = parseDate(cell);
          } else if (def.cellDataType === "boolean") {
            value = ["si", "sí", "true", "1", "x", "verdadero"].includes(cell.trim().toLowerCase());
          }
          node.setDataValue(col, value);
        });
      });
      return;
    }

    if ((key === "delete" || key === "backspace") && !mod) {
      const def = e.column.getColDef();
      if (def.field && def.editable !== false && e.value !== null && e.value !== "") {
        ev.preventDefault();
        e.node.setDataValue(e.column, null);
      }
    }
  };

  const allCols = (showCols && gridApi?.getColumns()) || [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canAdd && (
          <button className="btn btn-primary" onClick={addRow}>
            + Agregar fila
          </button>
        )}
        {canDelete && (
          <button className="btn btn-danger" disabled={!selectedCount} onClick={deleteSelected}>
            Borrar {selectedCount ? `(${selectedCount})` : ""}
          </button>
        )}
        <input
          className="input w-56"
          placeholder="Buscar en la tabla…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button className="btn" onClick={() => setShowCols((s) => !s)}>
              Columnas ▾
            </button>
            {showCols && (
              <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border bg-white p-2 shadow-lg">
                <p className="mb-1 px-1 text-xs text-slate-500">Mostrar u ocultar columnas</p>
                <div className="max-h-72 overflow-auto">
                  {allCols
                    .filter((c) => c.getColDef().headerName)
                    .map((c) => (
                      <label key={c.getColId()} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={c.isVisible()}
                          onChange={(ev) => {
                            apiRef.current?.setColumnsVisible([c], ev.target.checked);
                            force((n) => n + 1);
                          }}
                        />
                        {c.getColDef().headerName}
                      </label>
                    ))}
                </div>
                <button className="mt-2 w-full text-left text-xs text-slate-500 hover:underline" onClick={resetColumns}>
                  Restablecer columnas
                </button>
              </div>
            )}
          </div>
          <button
            className="btn"
            onClick={() =>
              apiRef.current?.exportDataAsCsv({
                fileName: `${exportName ?? table}.csv`,
                processCellCallback: (p) => {
                  const f = p.column.getColDef().valueFormatter;
                  return f ? p.formatValue(p.value) : p.value ?? "";
                },
              })
            }
          >
            Exportar a Excel (CSV)
          </button>
        </div>
      </div>

      <div style={{ height }} className="relative">
        <AgGridReact<Row>
          theme={excelTheme}
          localeText={AG_GRID_LOCALE_ES}
          rowData={rows}
          loading={loading}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          getRowId={(p) => String(p.data.id)}
          quickFilterText={search}
          rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
          selectionColumnDef={{ pinned: "left", width: 44, minWidth: 44, maxWidth: 44 }}
          dataTypeDefinitions={dataTypes}
          onSelectionChanged={(e) => setSelectedCount(e.api.getSelectedRows().length)}
          isExternalFilterPresent={() => Boolean(externalFilter)}
          doesExternalFilterPass={(n) => (externalFilter && n.data ? externalFilter(n.data) : true)}
          onCellValueChanged={onCellValueChanged}
          onCellKeyDown={onCellKeyDown}
          onGridReady={onGridReady}
          onColumnMoved={saveState}
          onColumnResized={(e) => e.finished && saveState()}
          onColumnVisible={saveState}
          onSortChanged={saveState}
          onColumnPinned={saveState}
          undoRedoCellEditing
          undoRedoCellEditingLimit={50}
          enterNavigatesVertically
          enterNavigatesVerticallyAfterEdit
          stopEditingWhenCellsLoseFocus
          singleClickEdit={false}
          animateRows={false}
          overlayNoRowsTemplate='<span style="color:#64748b">Sin datos todavía. Tocá "+ Agregar fila" para empezar.</span>'
        />
        {toast && (
          <div
            className={`pointer-events-none absolute bottom-3 right-3 rounded-md px-3 py-1.5 text-sm text-white shadow ${
              toast.error ? "bg-red-600" : "bg-slate-800"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Doble clic o empezá a escribir para editar · Enter baja a la fila siguiente · Ctrl+C / Ctrl+V copia y pega (también desde
        Excel) · Ctrl+Z deshace · Supr borra la celda · Arrastrá los encabezados para ordenar las columnas
      </p>
    </div>
  );
}
