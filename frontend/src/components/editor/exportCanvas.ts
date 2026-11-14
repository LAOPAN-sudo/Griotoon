// Export of the page drawn on the canvas, as PNG or PDF, done in the browser.

import Konva from "konva";
import { exportFileName, exportPixelRatio, pdfPageSize, type ExportFormat } from "@/lib/exportPage";
import type { Page } from "@/types/page";
import { getStage } from "./stageRegistry";

/** Layers that hold the page content; "uiLayer" (selection, handles, crop) is left out. */
const CONTENT_LAYERS = ["panelsLayer", "bubblesLayer"];

/**
 * Draws the page alone into a canvas: a hidden stage exactly the size of the
 * page, holding copies of the content layers, without the zoom and pan of
 * the editor. Shapes and text are redrawn at `pixelRatio`, not upscaled.
 */
export function renderPageCanvas(page: Page, pixelRatio: number): HTMLCanvasElement {
  const editorStage = getStage();
  if (!editorStage) throw new Error("Editor canvas not ready");
  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width: page.width, height: page.height });
  try {
    for (const name of CONTENT_LAYERS) {
      const layer = editorStage.findOne<Konva.Layer>(`.${name}`);
      if (!layer) continue;
      const copy = layer.clone({ listening: false }) as Konva.Layer;
      // The page sheet has a drop shadow in the editor, not in the file.
      copy.findOne(".page")?.setAttrs({ shadowEnabled: false });
      stage.add(copy);
    }
    return stage.toCanvas({ pixelRatio });
  } finally {
    stage.destroy();
  }
}

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

/** Export the page and start the download. `fileBase` is the translated base name ("planche"). */
export async function exportPage(page: Page, format: ExportFormat, fileBase: string): Promise<void> {
  const canvas = renderPageCanvas(page, exportPixelRatio(format));
  const fileName = exportFileName(fileBase, format);

  if (format === "png") {
    download(await canvasToBlob(canvas, "image/png"), fileName);
    return;
  }

  // jsPDF is loaded only when a PDF is asked for (about 350 KB that most
  // sessions never need: lighter first load on slow connections).
  const { jsPDF } = await import("jspdf");
  const size = pdfPageSize(page);
  const pdf = new jsPDF({ unit: "mm", format: [size.width, size.height], orientation: "portrait", compress: true });
  // JPEG keeps the file small (a few MB at 300 dpi instead of tens with PNG).
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, size.width, size.height, undefined, "FAST");
  download(pdf.output("blob"), fileName);
}
