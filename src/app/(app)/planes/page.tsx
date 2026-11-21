"use client";

import { useCallback, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { money } from "@/lib/grid";

export default function PlanesPage() {
  const { reload } = useData();
  const columns = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "Plan", minWidth: 180 },
      { field: "price", headerName: "Precio", cellDataType: "number", valueFormatter: (p) => money(p.value), maxWidth: 160 },
      { field: "description", headerName: "Descripción", minWidth: 300, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      { field: "active", headerName: "Activo", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );
  const onChange = useCallback(() => {
    reload();
  }, [reload]);
  return (
    <div className="space-y-3">
      <h1 className="page-title">Planes</h1>
      <p className="text-sm text-slate-600">Los planes que cargues acá aparecen en la columna “Plan” de cada cliente.</p>
      <EditableGrid fit table="plans" columns={columns} orderBy={{ column: "name", ascending: true }} exportName="planes" onChange={onChange} />
    </div>
  );
}
