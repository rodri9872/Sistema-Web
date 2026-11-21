"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/components/DataProvider";
import { supabase } from "@/lib/supabase/client";
import { today } from "@/lib/grid";
import { AXIS, GRID, SERIES } from "@/lib/palette";
import { MONTHS, num, pct, ratio } from "@/lib/metrics";
import { downloadPdf } from "@/lib/pdf";

type DayRow = { stat_date: string; new_followers: number | null; new_conversations: number | null };
type CallRow = { scheduled_date: string | null; close_result: string | null };
type Result = { label: string; followers: number; conversations: number; calls: number; sales: number };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const legendText = (v: string) => <span style={{ color: "#334155", fontSize: 13 }}>{v}</span>;

export default function ResultadosPage() {
  const { options } = useData();
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const [days, setDays] = useState<DayRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const from = `${year}-01-01`;
    const to = `${year + 1}-01-01`;
    Promise.all([
      supabase().from("daily_metrics").select("stat_date,new_followers,new_conversations").gte("stat_date", from).lt("stat_date", to),
      supabase().from("calls").select("scheduled_date,close_result").gte("scheduled_date", from).lt("scheduled_date", to),
    ]).then(([d, c]) => {
      setDays((d.data ?? []) as DayRow[]);
      setCalls((c.data ?? []) as CallRow[]);
      setLoading(false);
    });
  }, [year]);

  const { months, total } = useMemo(() => {
    const won = new Set(options.filter((o) => o.list_key === "cierre" && o.is_won).map((o) => o.value));
    const months: Result[] = MONTHS.map((m) => ({ label: cap(m), followers: 0, conversations: 0, calls: 0, sales: 0 }));
    for (const d of days) {
      const i = Number(d.stat_date.slice(5, 7)) - 1;
      months[i].followers += Number(d.new_followers) || 0;
      months[i].conversations += Number(d.new_conversations) || 0;
    }
    for (const c of calls) {
      if (!c.scheduled_date) continue;
      const i = Number(c.scheduled_date.slice(5, 7)) - 1;
      months[i].calls += 1;
      if (c.close_result && won.has(c.close_result)) months[i].sales += 1;
    }
    const total = months.reduce(
      (t, m) => ({
        ...t,
        followers: t.followers + m.followers,
        conversations: t.conversations + m.conversations,
        calls: t.calls + m.calls,
        sales: t.sales + m.sales,
      }),
      { label: "TOTAL AÑO", followers: 0, conversations: 0, calls: 0, sales: 0 },
    );
    return { months, total };
  }, [days, calls, options]);

  const cells = (r: Result) => [
    r.followers ? num(r.followers) : "",
    r.conversations ? num(r.conversations) : "",
    r.calls ? num(r.calls) : "",
    r.sales ? num(r.sales) : "",
    r.followers && r.calls ? pct(ratio(r.calls, r.followers)) : "",
    r.calls ? pct(ratio(r.sales, r.calls)) : "",
    r.followers && r.sales ? pct(ratio(r.sales, r.followers)) : "",
  ];
  const head = ["Nuevos seguidores", "Nuevas conversaciones", "Llamadas", "Ventas", "% Seguidores a llamada", "% Llamada a venta", "% Seguidores a venta"];

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadPdf({
        title: `Resultados mensuales ${year}`,
        head: ["Mes", ...head],
        body: months.map((m) => [m.label, ...cells(m)]),
        foot: [total.label, ...cells(total)],
        fileName: `resultados-mensuales-${year}`,
        landscape: true,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const chart = months.map((m) => ({ mes: m.label.slice(0, 3), llamadas: m.calls, ventas: m.sales }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Resultados mensuales</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button className="btn" onClick={() => setYear(year - 1)} aria-label="Año anterior">
              ‹
            </button>
            <span className="w-16 text-center font-medium tabular-nums">{year}</span>
            <button className="btn" onClick={() => setYear(year + 1)} aria-label="Año siguiente">
              ›
            </button>
          </div>
          <button className="btn btn-primary" onClick={exportPdf} disabled={loading || pdfBusy}>
            {pdfBusy ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Seguidores y conversaciones salen del registro diario de Redes. Llamadas y ventas salen de Llamadas (por la fecha de la
        llamada; una venta es un Cierre marcado como venta).
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="bg-green-800 text-xs text-white">
              <th className="sticky left-0 bg-green-800 px-3 py-2.5 text-left font-medium">Mes</th>
              {head.map((h) => (
                <th key={h} className="px-3 py-2.5 text-right font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {months.map((m, i) => (
              <tr key={m.label} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                <td className={`sticky left-0 px-3 py-2 font-medium ${i % 2 ? "bg-green-50" : "bg-green-50/70"} text-slate-800`}>{m.label}</td>
                {cells(m).map((v, j) => (
                  <td key={j} className="px-3 py-2 text-right">
                    {loading ? "" : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold tabular-nums">
              <td className="sticky left-0 bg-blue-600 px-3 py-2.5 text-white">{total.label}</td>
              {cells(total).map((v, j) => (
                <td key={j} className="px-3 py-2.5 text-right">
                  {loading ? "" : v}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-medium">Llamadas y ventas por mes</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="mes" {...AXIS} tickLine={false} />
            <YAxis {...AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <Tooltip cursor={{ fill: "#f1f5f9" }} />
            <Legend formatter={legendText} />
            <Bar dataKey="llamadas" name="Llamadas" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="ventas" name="Ventas" fill={SERIES[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
