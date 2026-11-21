// Cálculos del registro diario de redes (igual que la planilla)
export type Daily = {
  id?: number | string;
  stat_date: string | null;
  new_followers: number | null;
  new_conversations: number | null;
  follow_ups: number | null;
  proposals: number | null;
  calls_scheduled: number | null;
  sales_closed: number | null;
  ticket: number | null;
  notes?: string | null;
};

const n = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

export const totalConversations = (d: Partial<Daily>) => n(d.new_conversations) + n(d.follow_ups);
export const billing = (d: Partial<Daily>) => n(d.sales_closed) * n(d.ticket);
/** División segura: si el divisor es 0 devuelve null (en vez de #DIV/0!) */
export const ratio = (a: number, b: number) => (b ? a / b : null);

export function sumDaily(rows: Partial<Daily>[]) {
  const t = {
    new_followers: 0,
    new_conversations: 0,
    follow_ups: 0,
    proposals: 0,
    calls_scheduled: 0,
    sales_closed: 0,
    billing: 0,
  };
  for (const r of rows) {
    t.new_followers += n(r.new_followers);
    t.new_conversations += n(r.new_conversations);
    t.follow_ups += n(r.follow_ups);
    t.proposals += n(r.proposals);
    t.calls_scheduled += n(r.calls_scheduled);
    t.sales_closed += n(r.sales_closed);
    t.billing += billing(r);
  }
  const conversations = t.new_conversations + t.follow_ups;
  return {
    ...t,
    conversations,
    avgTicket: ratio(t.billing, t.sales_closed),
    pctProposals: ratio(t.proposals, conversations),
    pctCallsOverProposals: ratio(t.calls_scheduled, t.proposals),
    pctCallsOverConversations: ratio(t.calls_scheduled, conversations),
    pctSalesOverCalls: ratio(t.sales_closed, t.calls_scheduled),
  };
}

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : (v * 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
export const num = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("es-ES"));

export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const weekday = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};

/** "2026-08" -> { from: "2026-08-01", to: "2026-09-01", label: "Agosto 2026" } */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1) + " " + y;
  return { from: `${ym}-01`, to: `${next}-01`, label };
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
