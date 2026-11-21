"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { customFieldColumns, selectColumn } from "@/lib/grid";

export default function ClientesPage() {
  const { me, plans, profiles, clientStatuses, customFields, loading, reload } = useData();
  const [onlyMine, setOnlyMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  const columns = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "Cliente", pinned: "left", minWidth: 180 },
      { field: "company", headerName: "Empresa" },
      { field: "phone", headerName: "Teléfono" },
      { field: "email", headerName: "Correo" },
      selectColumn(
        "status_id",
        "Estado",
        clientStatuses.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, color: s.color })),
      ),
      selectColumn(
        "plan_id",
        "Plan",
        plans.map((p) => ({ value: p.id, label: p.name })),
      ),
      selectColumn(
        "owner_id",
        "Usuario a cargo",
        profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.username ?? "?" })),
      ),
      { field: "source", headerName: "Origen" },
      { field: "notes", headerName: "Notas", minWidth: 220, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      ...customFieldColumns(customFields, "clients"),
      {
        field: "created_at",
        headerName: "Alta",
        editable: false,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("es-AR") : ""),
        maxWidth: 120,
      },
    ],
    [plans, profiles, clientStatuses, customFields],
  );

  const externalFilter = useMemo(() => {
    if (!onlyMine && statusFilter === null) return undefined;
    return (r: Record<string, unknown>) =>
      (!onlyMine || r.owner_id === me?.id) && (statusFilter === null || r.status_id === statusFilter);
  }, [onlyMine, statusFilter, me?.id]);

  const onChange = useCallback(() => {
    reload();
  }, [reload]);

  if (loading) return <p className="text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-3">
      <h1 className="page-title">Clientes</h1>
      <EditableGrid
        table="clients"
        columns={columns}
        exportName="clientes"
        newRow={() => ({ name: "", owner_id: me?.id ?? null, status_id: clientStatuses[0]?.id ?? null })}
        externalFilter={externalFilter}
        onChange={onChange}
        toolbar={
          <>
            <button className={`btn ${onlyMine ? "btn-active" : ""}`} onClick={() => setOnlyMine((v) => !v)}>
              Solo mis clientes
            </button>
            <select
              className="input"
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos los estados</option>
              {clientStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        }
      />
    </div>
  );
}
