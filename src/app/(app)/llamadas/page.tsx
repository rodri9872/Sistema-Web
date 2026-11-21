"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { Pill, customFieldColumns, money, selectColumn, today } from "@/lib/grid";
import { COUNTRIES, findCountry, regionOf } from "@/lib/paises";
import type { OptionItem } from "@/lib/types";

type Range = "todas" | "hoy" | "semana" | "atrasadas";

const listOptions = (options: OptionItem[], key: OptionItem["list_key"]) =>
  options.filter((o) => o.list_key === key && o.active).map((o) => ({ value: o.value, label: o.value, color: o.color }));

export default function LlamadasPage() {
  const { me, plans, profiles, callStatuses, customFields, options, loading } = useData();
  const [onlyMine, setOnlyMine] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [range, setRange] = useState<Range>("todas");
  const [dateField, setDateField] = useState<"scheduled_date" | "scheduled_on">("scheduled_date");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("");

  const statusById = useMemo(() => new Map(callStatuses.map((s) => [s.id, s])), [callStatuses]);

  const columns = useMemo<ColDef[]>(() => {
    const people = profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.username ?? "?" }));
    return [
      {
        field: "scheduled_on",
        headerName: "Agendado (día que se agendó)",
        cellDataType: "dateString",
        width: 130,
      },
      selectColumn("setter_id", "Setter", people, { width: 140 }),
      { field: "contact_name", headerName: "Nombre", width: 180 },
      selectColumn(
        "country",
        "País",
        COUNTRIES.map((c) => ({ value: c.name, label: c.name })),
        {
          width: 160,
          // Acepta formas comunes (EEUU, Mexico...) y no pierde lo que no está en la lista
          valueParser: (p) => {
            const v = String(p.newValue ?? "").trim();
            if (!v) return null;
            return findCountry(v)?.name ?? v;
          },
          valueFormatter: (p) => p.value ?? "",
          filterValueGetter: (p) => p.data?.country ?? "",
          getQuickFilterText: (p) => p.value ?? "",
          comparator: (a, b) => String(a ?? "").localeCompare(String(b ?? "")),
        },
      ),
      {
        headerName: "Región",
        colId: "region",
        editable: false,
        width: 150,
        valueGetter: (p) => regionOf(p.data?.country),
        cellClass: "text-slate-600",
      },
      selectColumn("channel", "Vía", listOptions(options, "via"), { width: 120 }),
      selectColumn(
        "status_id",
        "Estado",
        callStatuses.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, color: s.color })),
        { width: 140 },
      ),
      { field: "scheduled_date", headerName: "Fecha de la llamada", cellDataType: "dateString", width: 130 },
      {
        field: "scheduled_time",
        headerName: "Hora",
        width: 95,
        valueParser: (p) => {
          const m = String(p.newValue ?? "").trim().match(/^(\d{1,2})[:.]?(\d{2})?(?::\d{2})?$/);
          if (!m) return p.newValue ? String(p.newValue) : null;
          return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
        },
      },
      selectColumn("user_id", "Closer", people, { width: 140 }),
      selectColumn(
        "completed",
        "Realizada",
        [
          { value: true, label: "Sí", color: "#16a34a" },
          { value: false, label: "No", color: "#dc2626" },
        ],
        { width: 110 },
      ),
      selectColumn("close_result", "Cierre", listOptions(options, "cierre"), { width: 140 }),
      selectColumn(
        "plan_id",
        "Plan",
        plans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.price != null ? `${p.name} · ${money(p.price)}` : p.name })),
        { width: 190 },
      ),
      {
        field: "price",
        headerName: "Precio",
        headerTooltip: "Precio de venta. Si lo dejás vacío se muestra el precio del plan (en gris).",
        cellDataType: "number",
        width: 115,
        type: "rightAligned",
        valueFormatter: (p) => {
          const own = p.value as number | null;
          const v = own ?? plans.find((x) => x.id === p.data?.plan_id)?.price ?? null;
          if (v === null || v === undefined) return "";
          const n = Number(v).toLocaleString("es-ES", { maximumFractionDigits: 2 });
          return p.data?.currency === "USD" ? `${n} US$` : `${n} €`;
        },
        cellClassRules: { "text-slate-400": (p) => p.value === null || p.value === undefined },
      },
      selectColumn(
        "currency",
        "Moneda",
        [
          { value: "EUR", label: "EUR €" },
          { value: "USD", label: "USD $" },
        ],
        { width: 100 },
      ),
      selectColumn("payment_type", "Tipo de pago", listOptions(options, "tipo_pago"), { width: 130 }),
      { field: "notes", headerName: "Observaciones", width: 260, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      { field: "duration_min", headerName: "Duración (min)", cellDataType: "number", width: 120, hide: true },
      { field: "result", headerName: "Resultado", width: 160, hide: true },
      ...customFieldColumns(customFields, "calls"),
    ];
  }, [plans, profiles, callStatuses, customFields, options]);

  const externalFilter = useMemo(() => {
    if (!onlyMine && status === null && range === "todas" && !from && !to) return undefined;
    return (r: Record<string, unknown>) => {
      const t = today();
      const in7 = new Date(new Date(t).getTime() + 7 * 86400000).toISOString().slice(0, 10);
      if (onlyMine && r.user_id !== me?.id && r.setter_id !== me?.id) return false;
      if (status !== null && r.status_id !== status) return false;
      if (from || to) {
        const fd = (r[dateField] as string | null) ?? "";
        if (!fd || (from && fd < from) || (to && fd > to)) return false;
      }
      const d = (r.scheduled_date as string | null) ?? "";
      if (range === "hoy" && d !== t) return false;
      if (range === "semana" && (d < t || d > in7)) return false;
      if (range === "atrasadas") {
        const st = statusById.get(r.status_id as number);
        if (!(d && d < t && !st?.is_final && r.completed !== true)) return false;
      }
      return true;
    };
  }, [onlyMine, status, range, me?.id, statusById, from, to, dateField]);

  const pickMonth = (ym: string) => {
    setMonth(ym);
    if (!ym) {
      setFrom("");
      setTo("");
      return;
    }
    const [y, m] = ym.split("-").map(Number);
    setFrom(`${ym}-01`);
    setTo(`${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`);
  };
  const clearDates = () => {
    setMonth("");
    setFrom("");
    setTo("");
  };

  if (loading) return <p className="text-slate-500">Cargando…</p>;

  const ranges: { key: Range; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "hoy", label: "Hoy" },
    { key: "semana", label: "Próximos 7 días" },
    { key: "atrasadas", label: "Atrasadas" },
  ];

  return (
    <div className="space-y-3">
      <h1 className="page-title">Llamadas agendadas</h1>
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
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <label className="flex flex-col text-xs text-slate-500">
          Filtrar por
          <select className="input mt-0.5" value={dateField} onChange={(e) => setDateField(e.target.value as typeof dateField)}>
            <option value="scheduled_date">Fecha de la llamada</option>
            <option value="scheduled_on">Día que se agendó</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          Mes
          <input type="month" className="input mt-0.5" value={month} onChange={(e) => pickMonth(e.target.value)} />
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          Desde
          <input
            type="date"
            className="input mt-0.5"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setMonth("");
            }}
          />
        </label>
        <label className="flex flex-col text-xs text-slate-500">
          Hasta
          <input
            type="date"
            className="input mt-0.5"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setMonth("");
            }}
          />
        </label>
        {(from || to) && (
          <button className="btn" onClick={clearDates}>
            Quitar fechas
          </button>
        )}
      </div>
      <EditableGrid
        table="calls"
        stateKey="calls_v5"
        columns={columns}
        exportName="llamadas"
        pdfTitle={
          from || to
            ? `Llamadas · ${from ? from.split("-").reverse().join("/") : "…"} al ${to ? to.split("-").reverse().join("/") : "…"}`
            : "Llamadas"
        }
        orderBy={{ column: "scheduled_on", ascending: false }}
        height="calc(100vh - 330px)"
        newRow={() => ({
          scheduled_on: today(),
          setter_id: me?.id ?? null,
          status_id: callStatuses.find((s) => s.active)?.id ?? null,
          scheduled_date: null,
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
