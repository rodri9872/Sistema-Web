import type { ColDef, ICellRendererParams, ValueFormatterParams, ValueParserParams } from "ag-grid-community";
import type { CustomField, Option } from "./types";

export function Pill({ label, color }: { label: string; color?: string }) {
  if (!label) return null;
  const c = color || "#64748b";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-5"
      style={{ background: c + "22", color: c, border: `1px solid ${c}55` }}
    >
      {label}
    </span>
  );
}

/** Columna con lista desplegable (plan, usuario, estado...). Guarda el id y muestra el nombre. */
export function selectColumn(field: string, headerName: string, options: Option[], extra: Partial<ColDef> = {}): ColDef {
  const byValue = new Map(options.map((o) => [String(o.value), o]));
  const label = (v: unknown) => (v === null || v === undefined || v === "" ? "" : byValue.get(String(v))?.label ?? "");
  const withColor = options.some((o) => o.color);
  return {
    field,
    headerName,
    cellDataType: false,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: ["", ...options.map((o) => o.value)] },
    valueFormatter: (p: ValueFormatterParams) => label(p.value),
    valueParser: (p: ValueParserParams) => {
      const v = p.newValue;
      if (v === "" || v === null || v === undefined) return null;
      const hit = byValue.get(String(v));
      if (hit) return hit.value;
      const text = String(v).trim().toLowerCase();
      const byLabel = options.find((o) => o.label.toLowerCase() === text);
      return byLabel ? byLabel.value : p.oldValue;
    },
    filterValueGetter: (p) => label(p.getValue(field)),
    getQuickFilterText: (p) => label(p.value),
    comparator: (a, b) => label(a).localeCompare(label(b)),
    cellRenderer: withColor
      ? (p: ICellRendererParams) => <Pill label={label(p.value)} color={byValue.get(String(p.value))?.color} />
      : undefined,
    ...extra,
  };
}

export const colorColumn = (field = "color", headerName = "Color"): ColDef => ({
  field,
  headerName,
  width: 130,
  cellRenderer: (p: ICellRendererParams) => (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-4 w-4 rounded border border-black/10" style={{ background: p.value }} />
      {p.value}
    </span>
  ),
});

/** Columnas extra que el usuario define en Configuración > Campos personalizados. */
export function customFieldColumns(fields: CustomField[], entity: "clients" | "calls"): ColDef[] {
  return fields
    .filter((f) => f.entity === entity && f.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => {
      const field = `custom.${f.field_key}`;
      const base: ColDef = { field, headerName: f.label, colId: field };
      switch (f.field_type) {
        case "numero":
          return { ...base, cellDataType: "number" };
        case "fecha":
          return { ...base, cellDataType: "dateString" };
        case "si_no":
          return { ...base, cellDataType: "boolean", width: 110 };
        case "lista": {
          const opts = (f.options ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ value: s, label: s }));
          return selectColumn(field, f.label, opts, { colId: field });
        }
        default:
          return { ...base, cellDataType: "text" };
      }
    });
}

export const money = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : "$ " + Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 });

export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
