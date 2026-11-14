import { describe, expect, it } from "vitest";
import { exportFileName, exportPixelRatio, pdfPageSize } from "./exportPage";
import { createEmptyPage } from "./page";

describe("export helpers", () => {
  it("names the file with a safe slug and the date", () => {
    const date = new Date(2026, 10, 4);
    expect(exportFileName("planche", "png", date)).toBe("griotoon-planche-2026-11-04.png");
    expect(exportFileName("Épisode 1 : l'arrivée", "pdf", date)).toBe("griotoon-episode-1-l-arrivee-2026-11-04.pdf");
    expect(exportFileName("???", "png", date)).toBe("griotoon-page-2026-11-04.png");
  });

  it("makes the default page an A4 PDF page", () => {
    expect(pdfPageSize(createEmptyPage())).toEqual({ width: 210, height: 297 });
    expect(pdfPageSize({ width: 800, height: 3200 })).toEqual({ width: 210, height: 840 });
  });

  it("exports PNG at the real size and PDF at print resolution", () => {
    expect(exportPixelRatio("png")).toBe(1);
    expect(exportPixelRatio("pdf")).toBe(2);
  });
});
