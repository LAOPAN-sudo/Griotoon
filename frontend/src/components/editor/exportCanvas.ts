// Export of the chapter as PNG (one page) or PDF (all pages), done in the browser.

import { exportFileName, exportPixelRatio, pdfPageSize } from "@/lib/exportPage";
import type { Page } from "@/types/page";
import { renderPageCanvas } from "./renderPage";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), type, quality),
  );
}

/** One page as a PNG at its real size. `fileBase` is the translated base name ("planche"). */
export async function exportPagePng(page: Page, fileBase: string): Promise<void> {
  const canvas = await renderPageCanvas(page, exportPixelRatio("png"));
  download(await canvasToBlob(canvas, "image/png"), exportFileName(fileBase, "png"));
}

/** Every page in one PDF, one PDF page per page, in order. `onProgress` gets the page being drawn (1-based). */
export async function exportChapterPdf(pages: Page[], fileBase: string, onProgress?: (page: number) => void): Promise<void> {
  // jsPDF is loaded only when a PDF is asked for (about 350 KB that most
  // sessions never need: lighter first load on slow connections).
  const { jsPDF } = await import("jspdf");
  let pdf: InstanceType<typeof jsPDF> | null = null;

  // One page at a time: a 300 dpi canvas takes about 35 MB, freed before the next one.
  for (const [index, page] of pages.entries()) {
    onProgress?.(index + 1);
    const size = pdfPageSize(page);
    const canvas = await renderPageCanvas(page, exportPixelRatio("pdf"));
    if (!pdf) pdf = new jsPDF({ unit: "mm", format: [size.width, size.height], orientation: "portrait", compress: true });
    else pdf.addPage([size.width, size.height], "portrait");
    // JPEG keeps the file small (a few MB at 300 dpi instead of tens with PNG).
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, size.width, size.height, undefined, "FAST");
    canvas.width = canvas.height = 0; // release the pixels now
  }
  if (pdf) download(pdf.output("blob"), exportFileName(fileBase, "pdf"));
}
