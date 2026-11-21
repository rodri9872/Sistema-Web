"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/components/DataProvider";
import { supabase } from "@/lib/supabase/client";
import { Pill, today } from "@/lib/grid";
import { AXIS, GRID } from "@/lib/palette";
import type { Call } from "@/lib/types";

export default function InicioPage() {
  const { me, clients, profiles, callStatuses, options, loading } = useData();
  const [calls, setCalls] = useState<Call[]>([]);
  const [month, setMonth] = useState(today().slice(0, 7));

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = new Date(y, m, 1).toISOString().slice(0, 10);
    const t = today();
    // Llamadas del mes elegido + pendientes desde hoy en adelante
    Promise.all([
      supabase().from("calls").select("*").gte("scheduled_date", from).lt("scheduled_date", to),
      supabase().from("calls").select("*").gte("scheduled_date", t).order("scheduled_date").order("scheduled_time").limit(200),
    ]).then(([a, b]) => {
      const map = new Map<number, Call>();
      [...(a.data ?? []), ...(b.data ?? [])].forEach((c: Call) => map.set(c.id, c));
      setCalls([...map.values()]);
    });
  }, [month]);

  const statusById = useMemo(() => new Map(callStatuses.map((s) => [s.id, s])), [callStatuses]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const userById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const wonValues = new Set(options.filter((o) => o.list_key === "cierre" && o.is_won).map((o) => o.value));
  const isDone = (c: Call) => c.completed === true || Boolean(statusById.get(c.status_id ?? -1)?.is_final);
  const isWon = (c: Call) => (c.close_result ? wonValues.has(c.close_result) : false) || Boolean(statusById.get(c.status_id ?? -1)?.is_won);
  const t = today();
  const inMonth = calls.filter((c) => c.scheduled_date?.startsWith(month));
  const pendingToday = calls.filter((c) => c.scheduled_date === t && !isDone(c));
  const doneMonth = inMonth.filter(isDone);
  const wonMonth = inMonth.filter(isWon);
  const upcoming = calls
    .filter((c) => (c.scheduled_date ?? "") >= t && !isDone(c))
    .sort((a, b) => `${a.scheduled_date}${a.scheduled_time ?? ""}`.localeCompare(`${b.scheduled_date}${b.scheduled_time ?? ""}`))
    .slice(0, 10);

  const byStatus = callStatuses
    .filter((s) => s.active)
    .map((s) => ({ name: s.name, color: s.color, total: inMonth.filter((c) => c.status_id === s.id).length }));

  const byUser = profiles
    .map((p) => {
      const own = inMonth.filter((c) => c.user_id === p.id);
      return {
        p,
        set: inMonth.filter((c) => c.setter_id === p.id).length,
        total: own.length,
        done: own.filter(isDone).length,
        won: own.filter(isWon).length,
        clients: clients.filter((c) => c.owner_id === p.id).length,
      };
    })
    .filter((r) => r.total || r.clients || r.set);

  if (loading) return <p className="text-slate-500">Cargando…</p>;

  const tiles = [
    { label: "Llamadas pendientes hoy", value: pendingToday.length, href: "/llamadas" },
    { label: "Llamadas del mes", value: inMonth.length },
    { label: "Realizadas en el mes", value: doneMonth.length },
    { label: "Cierres / ventas del mes", value: wonMonth.length },
    { label: "Clientes", value: clients.length, href: "/clientes" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Hola{me?.full_name ? `, ${me.full_name}` : ""} 👋</h1>
        <label className="text-sm text-slate-500">
          Mes:{" "}
          <input type="month" className="input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((k) => {
          const body = (
            <div className="card h-full">
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{k.value}</div>
            </div>
          );
          return k.href ? (
            <Link key={k.label} href={k.href} className="hover:opacity-80">
              {body}
            </Link>
          ) : (
            <div key={k.label}>{body}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-medium">Llamadas del mes por estado</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} tickLine={false} />
              <YAxis {...AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Llamadas"]} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {byStatus.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="mb-2 text-sm font-medium">Próximas llamadas</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No hay llamadas pendientes.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {upcoming.map((c) => {
                  const st = statusById.get(c.status_id ?? -1);
                  return (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-2 whitespace-nowrap tabular-nums text-slate-600">
                        {c.scheduled_date === t ? "Hoy" : c.scheduled_date?.split("-").reverse().slice(0, 2).join("/")}{" "}
                        {c.scheduled_time ?? ""}
                      </td>
                      <td className="py-1.5 pr-2">{c.contact_name || clientById.get(c.client_id ?? -1)?.name || "—"}</td>
                      <td className="py-1.5 pr-2 text-slate-500">{userById.get(c.user_id ?? "")?.full_name ?? ""}</td>
                      <td className="py-1.5">{st && <Pill label={st.name} color={st.color} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-medium">Resumen por usuario (mes)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1">Usuario</th>
              <th className="py-1 text-right">Clientes a cargo</th>
              <th className="py-1 text-right">Agendó (setter)</th>
              <th className="py-1 text-right">Llamadas (closer)</th>
              <th className="py-1 text-right">Concretadas</th>
              <th className="py-1 text-right">Cierres</th>
              <th className="py-1 text-right">% cierre</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {byUser.map((r) => (
              <tr key={r.p.id} className="border-t border-slate-100">
                <td className="py-1.5">{r.p.full_name ?? r.p.username}</td>
                <td className="py-1.5 text-right">{r.clients}</td>
                <td className="py-1.5 text-right">{r.set}</td>
                <td className="py-1.5 text-right">{r.total}</td>
                <td className="py-1.5 text-right">{r.done}</td>
                <td className="py-1.5 text-right">{r.won}</td>
                <td className="py-1.5 text-right">{r.done ? Math.round((r.won / r.done) * 100) + "%" : "—"}</td>
              </tr>
            ))}
            {byUser.length === 0 && (
              <tr>
                <td colSpan={7} className="py-2 text-slate-500">
                  Sin datos este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
