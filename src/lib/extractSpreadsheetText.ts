const MAX_CHARS = 8000;
const MAX_ROWS_PER_SHEET = 200;
const MAX_SHEETS = 5;

// Deliberately using exceljs, not the popular `xlsx` (SheetJS) package --
// the npm-registry build of `xlsx` has two unpatched high-severity
// advisories (prototype pollution, ReDoS) that trigger on exactly what
// this does: parsing an untrusted uploaded file. exceljs ships a real
// browser build (see its package.json "browser" field) so this still runs
// entirely client-side like the PDF extractor.
async function extractXlsxText(file: File): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  let out = "";
  let sheetsUsed = 0;
  workbook.eachSheet((sheet) => {
    if (sheetsUsed >= MAX_SHEETS || out.length > MAX_CHARS) return;
    sheetsUsed++;
    out += `Sheet: ${sheet.name}\n`;
    let rowsUsed = 0;
    sheet.eachRow((row) => {
      if (rowsUsed >= MAX_ROWS_PER_SHEET || out.length > MAX_CHARS) return;
      rowsUsed++;
      const cells = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
      out += cells.join(" | ") + "\n";
    });
    if (sheet.rowCount > rowsUsed) out += `[...${sheet.rowCount - rowsUsed} more rows not shown]\n`;
    out += "\n";
  });

  return out.trim();
}

function extractCsvText(raw: string): string {
  const lines = raw.split(/\r?\n/).slice(0, MAX_ROWS_PER_SHEET);
  const truncatedRows = raw.split(/\r?\n/).length > MAX_ROWS_PER_SHEET;
  let out = lines.join("\n");
  if (truncatedRows) out += "\n[...more rows not shown]";
  return out;
}

/** Extracts a plain-text (pipe-delimited row) preview of a spreadsheet's
 * content so it can be attached to a chat message the same way a .txt
 * file is -- capped in size, not a full-fidelity export. */
export async function extractSpreadsheetText(file: File): Promise<string> {
  const isCsv = file.type === "text/csv" || /\.csv$/i.test(file.name);
  const raw = isCsv ? extractCsvText(await file.text()) : await extractXlsxText(file);

  if (!raw.trim()) {
    throw new Error("This spreadsheet couldn't be read — it looks empty or its format isn't supported.");
  }

  return raw.length > MAX_CHARS ? `${raw.slice(0, MAX_CHARS)}\n[...truncated]` : raw;
}
