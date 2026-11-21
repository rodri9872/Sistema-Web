"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EditableGrid from "@/components/EditableGrid";
import { money, today } from "@/lib/grid";
import { supabase } from "@/lib/supabase/client";
import { AXIS, GRID, SERIES } from "@/lib/palette";
import {
  MONTHS,
  billing,
  monthRange,
  num,
  pct,
  ratio,
  shiftMonth,
  sumDaily,
  totalConversations,
  weekday,
  type Daily,
} from "@/lib/metrics";

type Tab = "diario" | "graficos" | "resumen";

const legendText = (v: string) => <span style={{ color: "#334155", fontSize: 13 }}>{v}</span>;
const dayLabel = (iso: string) => iso.slice(8, 10);

export default function RedesPage() {
  const [tab, setTab] = useState<Tab>("diario");
  const [month, setMonth] = useState(today().slice(0, 7));
  const range = useMemo(() => monthRange(month), [month]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "diario", label: "Registro diario" },
    { key: "graficos", label: "Estadísticas del mes" },
    { key: "resumen", label: "Resumen por mes" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Redes sociales</h1>
        {tab !== "resumen" && (
          <div className="flex items-center gap-1">
            <button className="btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
              ‹
            </button>
            <span className="w-32 text-center font-medium sm:w-40">{range.label}</span>
            <button className="btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
              ›
            </button>
            <input
              type="month"
              className="input ml-1 hidden sm:block"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              title="Elegir mes"
            />
          </div>
        )}
      </div>
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

      {tab === "diario" && <RegistroDiario month={month} />}
      {tab === "graficos" && <EstadisticasMes month={month} />}
      {tab === "resumen" && <ResumenMeses />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registro diario: una fila por día del mes, como la planilla
// ---------------------------------------------------------------------------
function RegistroDiario({ month }: { month: string }) {
  const range = useMemo(() => monthRange(month), [month]);
  const gridRange = useMemo(() => ({ column: "stat_date", gte: range.from, lt: range.to }), [range]);
  const beforeLoad = useCallback(async () => {
    await supabase().rpc("ensure_month_rows", { p_month: range.from });
  }, [range.from]);

  const totals = useCallback((rows: Record<string, unknown>[]) => {
    const t = sumDaily(rows as Partial<Daily>[]);
    return {
      id: "total",
      stat_date: null,
      _label: "TOTAL",
      new_followers: t.new_followers,
      new_conversations: t.new_conversations,
      follow_ups: t.follow_ups,
      proposals: t.proposals,
      calls_scheduled: t.calls_scheduled,
      sales_closed: t.sales_closed,
      ticket: t.avgTicket,
    };
  }, []);

  const columns = useMemo<ColDef[]>(() => {
    const d = (p: ValueGetterParams) => (p.data ?? {}) as Partial<Daily>;
    const numCol = (field: string, headerName: string, extra: Partial<ColDef> = {}): ColDef => ({
      field,
      headerName,
      cellDataType: "number",
      width: 125,
      filter: false,
      ...extra,
    });
    const calc = (headerName: string, getter: (r: Partial<Daily>) => number | null, fmt: (v: number | null) => string): ColDef => ({
      headerName,
      colId: headerName,
      editable: false,
      filter: false,
      width: 135,
      valueGetter: (p) => getter(d(p)),
      valueFormatter: (p) => fmt(p.value),
      cellClass: "bg-slate-50 text-slate-700",
      type: "rightAligned",
    });
    return [
      {
        headerName: "Día",
        colId: "dia",
        pinned: "left",
        editable: false,
        width: 110,
        valueGetter: (p) => (p.data?._label as string) ?? weekday(p.data?.stat_date ?? null),
        cellClass: "capitalize font-medium",
      },
      {
        field: "stat_date",
        headerName: "Fecha",
        pinned: "left",
        editable: false,
        width: 105,
        valueFormatter: (p) => (p.value ? `${p.value.slice(8, 10)}/${p.value.slice(5, 7)}/${p.value.slice(2, 4)}` : ""),
      },
      numCol("new_followers", "Nuevos seguidores"),
      numCol("new_conversations", "Nuevas conversaciones", { width: 140 }),
      numCol("follow_ups", "Follow ups"),
      calc("Total conversaciones del día", totalConversations, num),
      numCol("proposals", "Propuestas de agenda"),
      calc("% propuestas s/ conversaciones", (r) => ratio(Number(r.proposals) || 0, totalConversations(r)), pct),
      numCol("calls_scheduled", "Llamadas agendadas"),
      calc("% agendadas s/ propuestas", (r) => ratio(Number(r.calls_scheduled) || 0, Number(r.proposals) || 0), pct),
      calc("% agendadas s/ conversaciones", (r) => ratio(Number(r.calls_scheduled) || 0, totalConversations(r)), pct),
      numCol("sales_closed", "Ventas cerradas", {
        editable: false,
        cellClass: "bg-slate-50 text-slate-700",
        headerTooltip: "Se calcula solo: llamadas de ese día con Cierre \"Sí\" o Estado \"Cerrada\"",
      }),
      numCol("ticket", "Ticket", { valueFormatter: (p) => money(p.value) }),
      calc("Facturación", billing, (v) => money(v)),
      { field: "notes", headerName: "Notas", width: 220 },
    ];
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Completá cada día los números. Los totales, porcentajes y las ventas cerradas (que salen de Llamadas) se calculan solos (las celdas grises). Podés pegar varias filas
        copiadas desde tu Excel.
      </p>
      <EditableGrid
        key={month}
        table="daily_metrics"
        stateKey="daily_metrics_v2"
        columns={columns}
        range={gridRange}
        beforeLoad={beforeLoad}
        totals={totals}
        orderBy={{ column: "stat_date", ascending: true }}
        canAdd={false}
        canDelete={false}
        exportName={`redes-${month}`}
        pdfTitle={`Redes sociales · ${range.label}`}
        height="calc(100vh - 290px)"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estadísticas del mes
// ---------------------------------------------------------------------------
function useMonthRows(month: string) {
  const [rows, setRows] = useState<Daily[]>([]);
  useEffect(() => {
    const { from, to } = monthRange(month);
    supabase()
      .from("daily_metrics")
      .select("*")
      .gte("stat_date", from)
      .lt("stat_date", to)
      .order("stat_date")
      .then(({ data }) => setRows((data ?? []) as Daily[]));
  }, [month]);
  return rows;
}

function EstadisticasMes({ month }: { month: string }) {
  const rows = useMonthRows(month);
  const t = useMemo(() => sumDaily(rows), [rows]);
  const daily = rows.map((r) => ({
    day: r.stat_date ?? "",
    seguidores: r.new_followers ?? 0,
    nuevas: r.new_conversations ?? 0,
    followups: r.follow_ups ?? 0,
  }));
  const funnel = [
    { etapa: "Conversaciones", valor: t.conversations, nota: "" },
    { etapa: "Propuestas", valor: t.proposals, nota: pct(t.pctProposals) },
    { etapa: "Agendadas", valor: t.calls_scheduled, nota: pct(t.pctCallsOverProposals) },
    { etapa: "Ventas", valor: t.sales_closed, nota: pct(t.pctSalesOverCalls) },
  ];

  const tiles = [
    { label: "Nuevos seguidores", value: num(t.new_followers) },
    { label: "Conversaciones", value: num(t.conversations), sub: `${num(t.new_conversations)} nuevas · ${num(t.follow_ups)} follow ups` },
    { label: "Propuestas de agenda", value: num(t.proposals), sub: `${pct(t.pctProposals)} de las conversaciones` },
    { label: "Llamadas agendadas", value: num(t.calls_scheduled), sub: `${pct(t.pctCallsOverProposals)} de las propuestas` },
    { label: "Ventas cerradas", value: num(t.sales_closed), sub: `${pct(t.pctSalesOverCalls)} de las agendadas` },
    { label: "Facturación", value: money(t.billing) || "0 €", sub: t.avgTicket ? `Ticket promedio ${money(t.avgTicket)}` : "" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((k) => (
          <div key={k.label} className="card">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</div>
            {k.sub && <div className="mt-0.5 text-xs text-slate-500">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-medium">Conversaciones por día</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="day" tickFormatter={dayLabel} {...AXIS} tickLine={false} interval={1} />
              <YAxis {...AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip labelFormatter={(d) => `Día ${dayLabel(String(d))}`} cursor={{ fill: "#f1f5f9" }} />
              <Legend formatter={legendText} />
              <Bar dataKey="nuevas" name="Nuevas conversaciones" stackId="c" fill={SERIES[0]} stroke="#fff" strokeWidth={1} />
              <Bar dataKey="followups" name="Follow ups" stackId="c" fill={SERIES[1]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="mb-2 text-sm font-medium">Nuevos seguidores por día</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="day" tickFormatter={dayLabel} {...AXIS} tickLine={false} interval={1} />
              <YAxis {...AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <Tooltip labelFormatter={(d) => `Día ${dayLabel(String(d))}`} cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Nuevos seguidores"]} />
              <Bar dataKey="seguidores" fill={SERIES[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-medium">Embudo del mes (de conversación a venta)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 120, left: 20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="etapa" {...AXIS} tickLine={false} axisLine={false} width={110} />
            <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Cantidad"]} />
            <Bar dataKey="valor" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={28}>
              <LabelList
                dataKey="valor"
                position="right"
                content={(props) => {
                  const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    index?: number;
                  };
                  const f = funnel[index];
                  return (
                    <text x={Number(x) + Number(width) + 8} y={Number(y) + Number(height) / 2 + 4} fontSize={12} fill="#334155">
                      {f.valor}
                      {f.nota && <tspan fill="#64748b">{`  (${f.nota} de la etapa anterior)`}</tspan>}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumen por mes (últimos 12 meses)
// ---------------------------------------------------------------------------
function ResumenMeses() {
  const [rows, setRows] = useState<Daily[]>([]);
  useEffect(() => {
    const from = monthRange(shiftMonth(today().slice(0, 7), -11)).from;
    supabase()
      .from("daily_metrics")
      .select("*")
      .gte("stat_date", from)
      .order("stat_date")
      .then(({ data }) => setRows((data ?? []) as Daily[]));
  }, []);

  const byMonth = useMemo(() => {
    const groups = new Map<string, Daily[]>();
    for (const r of rows) {
      const k = (r.stat_date ?? "").slice(0, 7);
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    return [...groups.entries()]
      .map(([k, list]) => ({ k, t: sumDaily(list) }))
      .filter(({ t }) => t.conversations || t.new_followers || t.sales_closed)
      .sort((a, b) => b.k.localeCompare(a.k));
  }, [rows]);

  const label = (k: string) => {
    const [y, m] = k.split("-").map(Number);
    return MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1) + " " + y;
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="text-right text-xs text-slate-500">
          <tr>
            <th className="py-2 text-left">Mes</th>
            <th>Nuevos seguidores</th>
            <th>Conversaciones</th>
            <th>Propuestas</th>
            <th>% propuestas</th>
            <th>Agendadas</th>
            <th>% agendadas</th>
            <th>Ventas</th>
            <th>Facturación</th>
            <th>Ticket prom.</th>
          </tr>
        </thead>
        <tbody className="text-right tabular-nums">
          {byMonth.map(({ k, t }) => (
            <tr key={k} className="border-t border-slate-100">
              <td className="py-2 text-left font-medium">{label(k)}</td>
              <td>{num(t.new_followers)}</td>
              <td>{num(t.conversations)}</td>
              <td>{num(t.proposals)}</td>
              <td>{pct(t.pctProposals)}</td>
              <td>{num(t.calls_scheduled)}</td>
              <td>{pct(t.pctCallsOverProposals)}</td>
              <td>{num(t.sales_closed)}</td>
              <td>{money(t.billing) || "0 €"}</td>
              <td>{t.avgTicket ? money(t.avgTicket) : "—"}</td>
            </tr>
          ))}
          {byMonth.length === 0 && (
            <tr>
              <td colSpan={10} className="py-3 text-left text-slate-500">
                Todavía no hay datos cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
