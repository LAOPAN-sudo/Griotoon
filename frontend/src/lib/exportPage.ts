// Pure helpers for exporting a page (file names, PDF page size).

export type ExportFormat = "png" | "pdf";

/** A4 in millimetres. The default page (1240 × 1754 px at 150 dpi) is A4 portrait. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * PDF page size in millimetres: A4 width, height following the page ratio
 * (longer for a future webtoon strip). Within half a millimetre of A4 it is
 * exactly A4, so printers recognise the format (1754 px gives 297.05 mm).
 */
export function pdfPageSize(page: { width: number; height: number }): { width: number; height: number } {
  const height = (A4_WIDTH_MM * page.height) / page.width;
  if (Math.abs(height - A4_HEIGHT_MM) < 0.5) return { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
  return { width: A4_WIDTH_MM, height: Math.round(height * 100) / 100 };
}

/** "griotoon-planche-2026-11-14.png": a name that sorts by date and is safe on every system. */
export function exportFileName(base: string, format: ExportFormat, date = new Date()): string {
  const slug = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  return `griotoon-${slug || "page"}-${day}.${format}`;
}

/**
 * Pixel ratio of the exported image: 1 for PNG (real page size), 2 for PDF
 * (300 dpi, sharp when printed).
 */
export function exportPixelRatio(format: ExportFormat): number {
  return format === "pdf" ? 2 : 1;
}
