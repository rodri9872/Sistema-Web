"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EditableGrid from "@/components/EditableGrid";
import { useData } from "@/components/DataProvider";
import { colorColumn, selectColumn, today } from "@/lib/grid";
import { supabase } from "@/lib/supabase/client";
import { AXIS, GRID, SERIES } from "@/lib/palette";
import type { SocialStat } from "@/lib/types";

const NETWORKS = ["Instagram", "Facebook", "TikTok", "WhatsApp", "LinkedIn", "X / Twitter", "YouTube", "Otra"];

type Tab = "graficos" | "diario" | "cuentas";

const fmtDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
};
const legendText = (v: string) => <span style={{ color: "#334155", fontSize: 13 }}>{v}</span>;
const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("es-AR");

export default function RedesPage() {
  const { socialAccounts, reload, loading } = useData();
  const [tab, setTab] = useState<Tab>("graficos");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<SocialStat[]>([]);

  const accounts = useMemo(() => socialAccounts.filter((a) => a.active), [socialAccounts]);

  const loadStats = useCallback(async () => {
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase().from("social_stats").select("*").gte("stat_date", from).order("stat_date");
    setStats((data ?? []) as SocialStat[]);
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "graficos") loadStats();
  }, [tab, loadStats]);

  // Una fila por día, una columna por cuenta
  const series = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    for (const s of stats) {
      if (!s.account_id) continue;
      const row = byDay.get(s.stat_date) ?? { day: s.stat_date };
      if (s.followers != null) row[`f${s.account_id}`] = s.followers;
      row[`c${s.account_id}`] = ((row[`c${s.account_id}`] as number) ?? 0) + (s.conversations ?? 0);
      byDay.set(s.stat_date, row);
    }
    return [...byDay.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  }, [stats]);

  const kpis = useMemo(
    () =>
      accounts.map((a) => {
        const own = stats.filter((s) => s.account_id === a.id && s.followers != null);
        const last = own[own.length - 1];
        const first = own[0];
        const todayRow = stats.filter((s) => s.account_id === a.id && s.stat_date === today());
        return {
          a,
          followers: last?.followers ?? null,
          diff: last && first && last !== first ? (last.followers ?? 0) - (first.followers ?? 0) : null,
          convToday: todayRow.reduce((t, s) => t + (s.conversations ?? 0), 0),
          convPeriod: stats.filter((s) => s.account_id === a.id).reduce((t, s) => t + (s.conversations ?? 0), 0),
        };
      }),
    [accounts, stats],
  );

  const accountCols = useMemo<ColDef[]>(
    () => [
      selectColumn(
        "network",
        "Red social",
        NETWORKS.map((x) => ({ value: x, label: x })),
      ),
      { field: "handle", headerName: "Cuenta / usuario", minWidth: 200 },
      colorColumn("color", "Color en gráficos"),
      { field: "active", headerName: "Activa", cellDataType: "boolean", maxWidth: 110 },
    ],
    [],
  );

  const statCols = useMemo<ColDef[]>(
    () => [
      { field: "stat_date", headerName: "Fecha", cellDataType: "dateString", maxWidth: 150, sort: "desc" },
      selectColumn(
        "account_id",
        "Cuenta",
        socialAccounts.map((a) => ({ value: a.id, label: `${a.network} · ${a.handle}` })),
        { minWidth: 200 },
      ),
      { field: "followers", headerName: "Seguidores", cellDataType: "number" },
      { field: "conversations", headerName: "Conversaciones", cellDataType: "number" },
      { field: "messages", headerName: "Mensajes", cellDataType: "number" },
      { field: "posts", headerName: "Publicaciones", cellDataType: "number" },
      { field: "reach", headerName: "Alcance", cellDataType: "number" },
      { field: "notes", headerName: "Notas", minWidth: 200 },
    ],
    [socialAccounts],
  );

  const onAccountsChange = useCallback(() => {
    reload();
  }, [reload]);

  if (loading) return <p className="text-slate-500">Cargando…</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "graficos", label: "Estadísticas" },
    { key: "diario", label: "Carga diaria" },
    { key: "cuentas", label: "Cuentas" },
  ];

  return (
    <div className="space-y-3">
      <h1 className="page-title">Redes sociales</h1>
      <div className="flex gap-1 border-b border-slate-200">
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

      {tab === "graficos" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Período:</span>
            {[7, 30, 90, 365].map((d) => (
              <button key={d} className={`btn ${days === d ? "btn-active" : ""}`} onClick={() => setDays(d)}>
                {d === 365 ? "1 año" : `${d} días`}
              </button>
            ))}
          </div>

          {accounts.length === 0 ? (
            <div className="card text-sm text-slate-600">
              Todavía no hay cuentas. Andá a la pestaña <b>Cuentas</b> y agregá tus redes (Instagram, Facebook, etc.). Después cargá los
              números de cada día en <b>Carga diaria</b>.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map(({ a, followers, diff, convToday, convPeriod }) => (
                  <div key={a.id} className="card">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                      {a.network} · {a.handle}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{followers == null ? "—" : n(followers)}</div>
                    <div className="text-xs text-slate-500">
                      seguidores
                      {diff != null && (
                        <span className={diff >= 0 ? "text-green-700" : "text-red-600"}>
                          {" "}
                          · {diff >= 0 ? "▲ +" : "▼ "}
                          {n(diff)} en el período
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Conversaciones hoy: <b className="tabular-nums">{n(convToday)}</b> · en el período:{" "}
                      <b className="tabular-nums">{n(convPeriod)}</b>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="card">
                  <h2 className="mb-2 text-sm font-medium">Seguidores</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="day" tickFormatter={fmtDay} {...AXIS} tickLine={false} />
                      <YAxis {...AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => n(v)} width={60} domain={["auto", "auto"]} />
                      <Tooltip labelFormatter={(d) => fmtDay(String(d))} formatter={(v) => n(Number(v))} />
                      <Legend formatter={legendText} />
                      {accounts.map((a) => (
                        <Line
                          key={a.id}
                          dataKey={`f${a.id}`}
                          name={`${a.network} · ${a.handle}`}
                          stroke={a.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h2 className="mb-2 text-sm font-medium">Conversaciones por día</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="day" tickFormatter={fmtDay} {...AXIS} tickLine={false} />
                      <YAxis {...AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                      <Tooltip labelFormatter={(d) => fmtDay(String(d))} cursor={{ fill: "#f1f5f9" }} />
                      <Legend formatter={legendText} />
                      {accounts.map((a, i) => (
                        <Bar
                          key={a.id}
                          dataKey={`c${a.id}`}
                          name={`${a.network} · ${a.handle}`}
                          stackId="c"
                          fill={a.color}
                          stroke="#fff"
                          strokeWidth={1}
                          radius={i === accounts.length - 1 ? [4, 4, 0, 0] : 0}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "diario" && (
        <>
          <p className="text-sm text-slate-600">
            Cargá una fila por día y por cuenta: seguidores al cierre del día, conversaciones nuevas, mensajes, etc. Podés copiar y pegar
            varias filas desde Excel.
          </p>
          <EditableGrid
            key="stats"
            table="social_stats"
            columns={statCols}
            orderBy={{ column: "stat_date", ascending: false }}
            exportName="estadisticas-redes"
            height="calc(100vh - 290px)"
            newRow={() => ({ stat_date: today(), account_id: accounts[0]?.id ?? null })}
          />
        </>
      )}

      {tab === "cuentas" && (
        <>
          <p className="text-sm text-slate-600">Las cuentas de redes sociales que querés seguir.</p>
          <EditableGrid
            key="acc"
            fit
            table="social_accounts"
            columns={accountCols}
            orderBy={{ column: "id", ascending: true }}
            height="calc(100vh - 290px)"
            onChange={onAccountsChange}
            newRow={() => ({ network: "Instagram", handle: "@cuenta", color: SERIES[socialAccounts.length % SERIES.length] })}
          />
        </>
      )}
    </div>
  );
}
