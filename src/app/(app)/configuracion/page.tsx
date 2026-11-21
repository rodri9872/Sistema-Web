"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { colorColumn, selectColumn } from "@/lib/grid";
import UsuariosAdmin from "@/components/UsuariosAdmin";

type Tab = "llamadas" | "listas" | "clientes" | "campos" | "usuarios";

export default function ConfiguracionPage() {
  const { reload } = useData();
  const [tab, setTab] = useState<Tab>("llamadas");
  const onChange = useCallback(() => {
    reload();
  }, [reload]);

  const callStatusCols = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "Estado", minWidth: 180 },
      colorColumn(),
      { field: "sort_order", headerName: "Orden", cellDataType: "number", maxWidth: 110 },
      { field: "is_final", headerName: "Llamada terminada", cellDataType: "boolean", headerTooltip: "La llamada ya se hizo (no queda pendiente)" },
      { field: "is_won", headerName: "Cuenta como cierre/venta", cellDataType: "boolean" },
      { field: "active", headerName: "Activo", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );

  const listCols = useMemo<ColDef[]>(
    () => [
      selectColumn("list_key", "Lista", [
        { value: "via", label: "Vía" },
        { value: "cierre", label: "Cierre" },
        { value: "tipo_pago", label: "Tipo de pago" },
      ]),
      { field: "value", headerName: "Opción", minWidth: 180 },
      colorColumn(),
      { field: "sort_order", headerName: "Orden", cellDataType: "number", maxWidth: 110 },
      { field: "is_won", headerName: "Cuenta como venta (Cierre)", cellDataType: "boolean" },
      { field: "active", headerName: "Activa", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );

  const clientStatusCols = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "Estado", minWidth: 180 },
      colorColumn(),
      { field: "sort_order", headerName: "Orden", cellDataType: "number", maxWidth: 110 },
      { field: "active", headerName: "Activo", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );

  const fieldCols = useMemo<ColDef[]>(
    () => [
      selectColumn("entity", "Tabla", [
        { value: "clients", label: "Clientes" },
        { value: "calls", label: "Llamadas" },
      ]),
      { field: "label", headerName: "Nombre de la columna", minWidth: 200 },
      selectColumn("field_type", "Tipo", [
        { value: "texto", label: "Texto" },
        { value: "numero", label: "Número" },
        { value: "fecha", label: "Fecha" },
        { value: "lista", label: "Lista de opciones" },
        { value: "si_no", label: "Sí / No" },
      ]),
      { field: "options", headerName: "Opciones (si es lista, separadas por coma)", minWidth: 280 },
      { field: "sort_order", headerName: "Orden", cellDataType: "number", maxWidth: 110 },
      { field: "active", headerName: "Visible", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "llamadas", label: "Estados de llamadas" },
    { key: "listas", label: "Listas desplegables" },
    { key: "clientes", label: "Estados de clientes" },
    { key: "campos", label: "Campos personalizados" },
    { key: "usuarios", label: "Usuarios" },
  ];

  const h = "calc(100vh - 290px)";

  return (
    <div className="space-y-3">
      <h1 className="page-title">Configuración</h1>
      <div className="-mx-3 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 px-3 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.key ? "border-green-600 font-medium text-green-800" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "llamadas" && (
        <>
          <p className="text-sm text-slate-600">
            Definí los estados que puede tener una llamada (agendada, concretada, cerrada…). Marcá “Cuenta como cierre/venta” en los
            estados que querés contar como éxito en las estadísticas.
          </p>
          <EditableGrid fit key="cs" table="call_statuses" columns={callStatusCols} orderBy={{ column: "sort_order", ascending: true }} height={h} onChange={onChange} />
        </>
      )}
      {tab === "listas" && (
        <>
          <p className="text-sm text-slate-600">
            Opciones de las columnas <b>Vía</b>, <b>Cierre</b> y <b>Tipo de pago</b> de Llamadas. Agregá, cambiá el nombre o el color, o
            desactivá las que no uses. Marcá “Cuenta como venta” en las opciones de Cierre que son una venta.
          </p>
          <EditableGrid
            key="ol"
            fit
            table="option_lists"
            columns={listCols}
            orderBy={{ column: "sort_order", ascending: true }}
            height={h}
            onChange={onChange}
            newRow={() => ({ list_key: "via", value: "Nueva opción" })}
          />
        </>
      )}
      {tab === "clientes" && (
        <>
          <p className="text-sm text-slate-600">Estados que puede tener un cliente (prospecto, activo, baja…).</p>
          <EditableGrid fit key="cls" table="client_statuses" columns={clientStatusCols} orderBy={{ column: "sort_order", ascending: true }} height={h} onChange={onChange} />
        </>
      )}
      {tab === "campos" && (
        <>
          <p className="text-sm text-slate-600">
            Agregá columnas propias a las tablas de Clientes o Llamadas (por ejemplo “Rubro”, “Fecha de renovación”, “¿Pagó?”). Aparecen
            automáticamente como una columna más.
          </p>
          <EditableGrid
            fit
            key="cf"
            table="custom_fields"
            columns={fieldCols}
            orderBy={{ column: "sort_order", ascending: true }}
            height={h}
            onChange={onChange}
            newRow={() => ({ entity: "clients", field_type: "texto" })}
          />
        </>
      )}
      {tab === "usuarios" && <UsuariosAdmin height="calc(100vh - 330px)" />}
    </div>
  );
}
