import type { jsPDF } from "jspdf";

/** Dibuja un cuadro "Observaciones" debajo de la última tabla (o en una página nueva si no entra). */
export function drawNote(doc: jsPDF, note: string | undefined, margin: number, bottom = 40) {
  const text = note?.trim();
  if (!text) return;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const width = W - 2 * margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, width - 24) as string[];
  const lineH = 13;
  const boxH = 30 + lines.length * lineH;
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let y = (last?.finalY ?? 60) + 18;
  if (y + boxH > H - bottom) {
    doc.addPage();
    y = 40;
  }
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, width, boxH, 5, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text("Observaciones", margin + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(lines, margin + 12, y + 18 + lineH + 2);
}
