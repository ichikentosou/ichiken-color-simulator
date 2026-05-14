import * as XLSX from "xlsx";

export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}

export function parseExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`[シート: ${sheetName}]`);
    lines.push(csv);
  }
  return lines.join("\n");
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}
