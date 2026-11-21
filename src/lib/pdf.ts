// Genera un PDF con una tabla y lo descarga. Las librerías se cargan solo al usarlo.
export type PdfReport = {
  title: string;
  subtitle?: string;
  head: string[];
  body: (string | number)[][];
  foot?: (string | number)[];
  fileName: string;
  landscape?: boolean;
};

export async function downloadPdf(r: PdfReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: r.landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(r.title, 40, 46);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const generated = `Generado el ${new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}`;
  doc.text(r.subtitle ? `${r.subtitle} · ${generated}` : generated, 40, 64);
  autoTable(doc, {
    startY: 80,
    head: [r.head],
    body: r.body.map((row) => row.map((c) => String(c ?? ""))),
    foot: r.foot ? [r.foot.map((c) => String(c ?? ""))] : undefined,
    showFoot: "lastPage",
    theme: "grid",
    margin: { left: 40, right: 40 },
    styles: { fontSize: r.head.length > 10 ? 7 : 9, cellPadding: 4, lineColor: [226, 232, 240], textColor: [30, 41, 59] },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${page}`, w - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    },
  });
  doc.save(r.fileName.endsWith(".pdf") ? r.fileName : `${r.fileName}.pdf`);
}
