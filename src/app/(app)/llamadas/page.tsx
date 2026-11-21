"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { Pill, customFieldColumns, selectColumn, today } from "@/lib/grid";

type Range = "todas" | "hoy" | "semana" | "atrasadas";

export default function LlamadasPage() {
  const { me, clients, profiles, callStatuses, customFields, loading } = useData();
  const [onlyMine, setOnlyMine] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [range, setRange] = useState<Range>("todas");

  const statusById = useMemo(() => new Map(callStatuses.map((s) => [s.id, s])), [callStatuses]);

  const columns = useMemo<ColDef[]>(
    () => [
      { field: "scheduled_date", headerName: "Fecha", cellDataType: "dateString", maxWidth: 140, sort: "desc" },
      {
        field: "scheduled_time",
        headerName: "Hora",
        maxWidth: 100,
        valueParser: (p) => {
          const m = String(p.newValue ?? "").match(/^(\d{1,2})[:.]?(\d{2})?$/);
          if (!m) return p.newValue ? p.oldValue : null;
          return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
        },
      },
      selectColumn(
        "client_id",
        "Cliente",
        clients.map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
        { minWidth: 200, pinned: "left" },
      ),
      selectColumn(
        "status_id",
        "Estado",
        callStatuses.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, color: s.color })),
      ),
      selectColumn(
        "user_id",
        "Usuario",
        profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.username ?? "?" })),
      ),
      { field: "duration_min", headerName: "Duración (min)", cellDataType: "number", maxWidth: 140 },
      { field: "result", headerName: "Resultado" },
      { field: "notes", headerName: "Notas", minWidth: 240, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      ...customFieldColumns(customFields, "calls"),
    ],
    [clients, profiles, callStatuses, customFields],
  );

  const externalFilter = useMemo(() => {
    if (!onlyMine && status === null && range === "todas") return undefined;
    return (r: Record<string, unknown>) => {
      const t = today();
      const in7 = new Date(new Date(t).getTime() + 7 * 86400000).toISOString().slice(0, 10);
      if (onlyMine && r.user_id !== me?.id) return false;
      if (status !== null && r.status_id !== status) return false;
      const d = (r.scheduled_date as string | null) ?? "";
      if (range === "hoy" && d !== t) return false;
      if (range === "semana" && (d < t || d > in7)) return false;
      if (range === "atrasadas") {
        const st = statusById.get(r.status_id as number);
        if (!(d && d < t && !st?.is_final)) return false;
      }
      return true;
    };
  }, [onlyMine, status, range, me?.id, statusById]);

  if (loading) return <p className="text-slate-500">Cargando…</p>;

  const ranges: { key: Range; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "hoy", label: "Hoy" },
    { key: "semana", label: "Próximos 7 días" },
    { key: "atrasadas", label: "Atrasadas" },
  ];

  return (
    <div className="space-y-3">
      <h1 className="page-title">Llamadas</h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Estado:</span>
        <button className={`btn ${status === null ? "btn-active" : ""}`} onClick={() => setStatus(null)}>
          Todos
        </button>
        {callStatuses
          .filter((s) => s.active)
          .map((s) => (
            <button
              key={s.id}
              className={`btn ${status === s.id ? "ring-2 ring-slate-800" : ""}`}
              onClick={() => setStatus(status === s.id ? null : s.id)}
            >
              <Pill label={s.name} color={s.color} />
            </button>
          ))}
      </div>
      <EditableGrid
        table="calls"
        columns={columns}
        exportName="llamadas"
        orderBy={{ column: "scheduled_date", ascending: false }}
        height="calc(100vh - 260px)"
        newRow={() => ({
          scheduled_date: today(),
          user_id: me?.id ?? null,
          status_id: callStatuses.find((s) => s.active)?.id ?? null,
        })}
        externalFilter={externalFilter}
        toolbar={
          <>
            {ranges.map((r) => (
              <button key={r.key} className={`btn ${range === r.key ? "btn-active" : ""}`} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
            <button className={`btn ${onlyMine ? "btn-active" : ""}`} onClick={() => setOnlyMine((v) => !v)}>
              Solo mías
            </button>
          </>
        }
      />
    </div>
  );
}
