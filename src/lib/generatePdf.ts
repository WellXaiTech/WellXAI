function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

export async function textToPdfBlob(title: string, body: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines: string[] = doc.splitTextToSize(title, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 20 + 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const paragraphs = stripMarkdown(body).split("\n");
  for (const para of paragraphs) {
    const lines: string[] = doc.splitTextToSize(para || " ", maxWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 16;
    }
    y += 4;
  }

  return doc.output("blob");
}
