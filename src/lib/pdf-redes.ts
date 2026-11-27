// Informe de Redes sociales en PDF: resumen arriba, tabla por día y totales.
import { drawNote } from "@/lib/pdf-note";
import { MONTHS, billing, pct, ratio, sumDaily, totalConversations, weekday, type Daily } from "@/lib/metrics";

type RGB = [number, number, number];
const GREEN: RGB = [22, 101, 52];
const GREEN_SOFT: RGB = [240, 253, 244];
const SLATE: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const WEEKEND: RGB = [248, 250, 252];
const SUBTOTAL: RGB = [220, 252, 231];

const fmtNum = (v: number | null | undefined) => (v ? v.toLocaleString("es-ES") : "–");
const fmtMoney = (v: number | null | undefined) =>
  v ? `${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €` : "–";
const fmtPct = (v: number | null) => (v === null ? "–" : pct(v));
const n = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
export const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Una fila por día del rango (los días sin datos quedan vacíos) */
export function fillDays(rows: Daily[], from: string, to: string): Daily[] {
  const byDate = new Map(rows.map((r) => [r.stat_date, r]));
  const out: Daily[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let cur = new Date(y, m - 1, d); ; cur.setDate(cur.getDate() + 1)) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (iso > to) break;
    out.push(
      byDate.get(iso) ?? {
        stat_date: iso,
        new_followers: null,
        new_conversations: null,
        follow_ups: null,
        proposals: null,
        calls_scheduled: null,
        sales_closed: null,
        ticket: null,
      },
    );
  }
  return out;
}

export const REPORT_HEAD = [
  "Día",
  "Fecha",
  "Nuevos\nseguidores",
  "Nuevas\nconversac.",
  "Follow\nups",
  "Total\nconversac.",
  "Propuestas\nde agenda",
  "% propuestas\ns/ conversac.",
  "Llamadas\nagendadas",
  "% agendadas\ns/ propuestas",
  "Ventas\ncerradas",
  "Ticket",
  "Facturación",
];

export function dayCells(r: Daily): string[] {
  const conv = totalConversations(r);
  return [
    cap(weekday(r.stat_date)),
    r.stat_date ? fmtDate(r.stat_date) : "",
    fmtNum(n(r.new_followers)),
    fmtNum(n(r.new_conversations)),
    fmtNum(n(r.follow_ups)),
    fmtNum(conv),
    fmtNum(n(r.proposals)),
    conv && n(r.proposals) ? fmtPct(ratio(n(r.proposals), conv)) : "–",
    fmtNum(n(r.calls_scheduled)),
    n(r.proposals) && n(r.calls_scheduled) ? fmtPct(ratio(n(r.calls_scheduled), n(r.proposals))) : "–",
    fmtNum(n(r.sales_closed)),
    n(r.sales_closed) ? fmtMoney(n(r.ticket)) : "–",
    fmtMoney(billing(r)),
  ];
}

export function totalCells(label: string, rows: Daily[]): string[] {
  const t = sumDaily(rows);
  return [
    label,
    "",
    fmtNum(t.new_followers),
    fmtNum(t.new_conversations),
    fmtNum(t.follow_ups),
    fmtNum(t.conversations),
    fmtNum(t.proposals),
    fmtPct(t.pctProposals),
    fmtNum(t.calls_scheduled),
    fmtPct(t.pctCallsOverProposals),
    fmtNum(t.sales_closed),
    fmtMoney(t.avgTicket),
    fmtMoney(t.billing),
  ];
}

export async function downloadRedesReport(rows: Daily[], from: string, to: string, note?: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const days = fillDays(rows, from, to);
  const t = sumDaily(days);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 32;

  // Encabezado
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Informe de Redes sociales", M, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Del ${fmtDate(from)} al ${fmtDate(to)}  ·  ${days.length} días`, M, 49);
  doc.setFontSize(9);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}`,
    W - M,
    49,
    { align: "right" },
  );

  // Tarjetas de resumen
  const cards: { label: string; value: string; sub: string }[] = [
    { label: "Nuevos seguidores", value: fmtNum(t.new_followers), sub: `${fmtNum(Math.round(t.new_followers / days.length))} por día` },
    { label: "Conversaciones", value: fmtNum(t.conversations), sub: `${fmtNum(t.new_conversations)} nuevas · ${fmtNum(t.follow_ups)} follow ups` },
    { label: "Propuestas de agenda", value: fmtNum(t.proposals), sub: `${fmtPct(t.pctProposals)} de las conversaciones` },
    { label: "Llamadas agendadas", value: fmtNum(t.calls_scheduled), sub: `${fmtPct(t.pctCallsOverProposals)} de las propuestas` },
    { label: "Ventas cerradas", value: fmtNum(t.sales_closed), sub: `${fmtPct(t.pctSalesOverCalls)} de las agendadas` },
    { label: "Facturación", value: fmtMoney(t.billing), sub: t.avgTicket ? `Ticket promedio ${fmtMoney(t.avgTicket)}` : "" },
  ];
  const gap = 8;
  const cw = (W - 2 * M - gap * (cards.length - 1)) / cards.length;
  const cy = 80;
  cards.forEach((c, i) => {
    const x = M + i * (cw + gap);
    doc.setFillColor(...GREEN_SOFT);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, cy, cw, 62, 6, 6, "FD");
    doc.setFillColor(...GREEN);
    doc.rect(x, cy + 6, 3, 50, "F");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(c.label.toUpperCase(), x + 12, cy + 17);
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(c.value, x + 12, cy + 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(c.sub, x + 12, cy + 52, { maxWidth: cw - 18 });
  });

  // Tabla por día (con subtotal por mes si el rango abarca más de uno)
  const months = [...new Set(days.map((d) => (d.stat_date ?? "").slice(0, 7)))];
  type Row = { cells: string[]; kind: "day" | "weekend" | "subtotal" };
  const body: Row[] = [];
  for (const ym of months) {
    const list = days.filter((d) => (d.stat_date ?? "").startsWith(ym));
    for (const d of list) {
      const wd = new Date(`${d.stat_date}T12:00:00`).getDay();
      body.push({ cells: dayCells(d), kind: wd === 0 || wd === 6 ? "weekend" : "day" });
    }
    if (months.length > 1) {
      const [y, m] = ym.split("-").map(Number);
      body.push({ cells: totalCells(`Total ${MONTHS[m - 1]} ${y}`, list), kind: "subtotal" });
    }
  }

  // La etiqueta de totales ocupa las columnas Día y Fecha
  const span = (cells: string[]) => [{ content: cells[0], colSpan: 2, styles: { halign: "left" as const } }, ...cells.slice(2)];

  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detalle por día", M, cy + 84);

  autoTable(doc, {
    startY: cy + 92,
    head: [REPORT_HEAD],
    body: body.map((r) => (r.kind === "subtotal" ? span(r.cells) : r.cells)),
    foot: [span(totalCells("TOTAL DEL PERÍODO", days))],
    showFoot: "lastPage",
    theme: "grid",
    margin: { left: M, right: M, top: 40, bottom: 34 },
    styles: { fontSize: 8, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, lineColor: LINE, lineWidth: 0.5, textColor: SLATE, halign: "right", valign: "middle" },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7.5 },
    footStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: { 0: { halign: "left", cellWidth: 58 }, 1: { halign: "left", cellWidth: 58 } },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const row = body[data.row.index];
      if (row.kind === "weekend") data.cell.styles.fillColor = WEEKEND;
      if (row.kind === "subtotal") {
        data.cell.styles.fillColor = SUBTOTAL;
        data.cell.styles.fontStyle = "bold";
      }
      if (data.cell.raw === "–") data.cell.styles.textColor = [203, 213, 225];
    },
    didDrawPage: () => {
      if (doc.getNumberOfPages() > 1 && doc.getCurrentPageInfo().pageNumber > 1) {
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(`Informe de Redes sociales · ${fmtDate(from)} al ${fmtDate(to)}`, M, 24);
      }
    },
  });

  drawNote(doc, note, M, 34);

  // Pie de página con número de página
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.line(M, H - 24, W - M, H - 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Los días de fin de semana aparecen sombreados. – = sin datos.", M, H - 12);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 12, { align: "right" });
  }

  doc.save(`informe-redes-${from}-al-${to}.pdf`);
}
