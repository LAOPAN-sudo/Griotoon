import { describe, expect, it } from "vitest";
import {
  checkImageFile,
  clampCrop,
  coverCrop,
  coverScale,
  fitWithin,
  MAX_FILE_BYTES,
  MAX_ZOOM_FACTOR,
  zoomCrop,
} from "./image";
import { containsPoint, toLocal, topmostAt } from "./geometry";

const landscape = { width: 2000, height: 1000 };

describe("fitWithin", () => {
  it("shrinks the longest side to the maximum", () => {
    expect(fitWithin(6000, 4000, 2000)).toEqual({ width: 2000, height: 1333 });
    expect(fitWithin(1000, 3000, 2000)).toEqual({ width: 667, height: 2000 });
  });

  it("never enlarges a small image", () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

describe("cover crop", () => {
  it("covers a portrait panel with a landscape image, centred", () => {
    const crop = coverCrop(400, 600, landscape);
    expect(crop.scale).toBeCloseTo(0.6); // height decides: 600 / 1000
    expect(crop.offsetY).toBeCloseTo(0);
    expect(crop.offsetX).toBeCloseTo((400 - 2000 * 0.6) / 2);
  });

  it("covers a wide panel by width", () => {
    expect(coverScale(1000, 100, landscape)).toBeCloseTo(0.5);
  });
});

describe("clampCrop", () => {
  const base = { ...landscape, src: "x", ...coverCrop(400, 600, landscape) };

  it("never leaves an empty area inside the panel", () => {
    const moved = clampCrop(400, 600, { ...base, offsetX: 50, offsetY: -30 });
    expect(moved.offsetX).toBe(0);
    expect(moved.offsetY).toBe(0);
    const tooFar = clampCrop(400, 600, { ...base, offsetX: -5000 });
    expect(tooFar.offsetX).toBeCloseTo(400 - 2000 * base.scale);
  });

  it("keeps the scale between cover and the zoom limit", () => {
    expect(clampCrop(400, 600, { ...base, scale: 0.01 }).scale).toBeCloseTo(0.6);
    expect(clampCrop(400, 600, { ...base, scale: 100 }).scale).toBeCloseTo(0.6 * MAX_ZOOM_FACTOR);
  });

  it("refits the image when the panel grows", () => {
    const grown = clampCrop(1500, 600, base);
    expect(grown.scale).toBeCloseTo(0.75); // 1500 / 2000
    expect(grown.offsetX).toBeLessThanOrEqual(0);
    expect(grown.offsetX + 2000 * grown.scale).toBeGreaterThanOrEqual(1500 - 1e-9);
  });

  it("keeps extra fields like src", () => {
    expect(clampCrop(400, 600, base).src).toBe("x");
  });
});

describe("zoomCrop", () => {
  it("keeps the image point under the anchor fixed", () => {
    const start = { ...landscape, ...coverCrop(400, 600, landscape) };
    const anchor = { x: 100, y: 200 };
    const imagePoint = (c: typeof start) => ({
      x: (anchor.x - c.offsetX) / c.scale,
      y: (anchor.y - c.offsetY) / c.scale,
    });
    const zoomed = zoomCrop(400, 600, start, start.scale * 2, anchor);
    expect(imagePoint(zoomed).x).toBeCloseTo(imagePoint(start).x);
    expect(imagePoint(zoomed).y).toBeCloseTo(imagePoint(start).y);
  });
});

describe("checkImageFile", () => {
  it("accepts common photo formats and refuses others", () => {
    expect(checkImageFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkImageFile({ type: "image/webp", size: 1000 })).toBeNull();
    expect(checkImageFile({ type: "image/svg+xml", size: 1000 })).toBe("notImage");
    expect(checkImageFile({ type: "application/pdf", size: 1000 })).toBe("notImage");
    expect(checkImageFile({ type: "image/png", size: MAX_FILE_BYTES + 1 })).toBe("tooLarge");
  });
});

describe("hit testing", () => {
  const a = { x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0 };
  const b = { x: 50, y: 50, w: 100, h: 100, rotation: 0, z: 1 };

  it("finds the topmost panel under a point", () => {
    expect(topmostAt([a, b], { x: 75, y: 75 })).toBe(b);
    expect(topmostAt([a, b], { x: 10, y: 10 })).toBe(a);
    expect(topmostAt([a, b], { x: 500, y: 500 })).toBeUndefined();
  });

  it("handles rotated panels", () => {
    const r = { x: 100, y: 100, w: 100, h: 20, rotation: 90 };
    expect(toLocal(r, { x: 90, y: 150 }).x).toBeCloseTo(50);
    expect(containsPoint(r, { x: 90, y: 150 })).toBe(true);
    expect(containsPoint(r, { x: 150, y: 110 })).toBe(false);
  });
});

describe("visible part of the image", async () => {
  const { visiblePart } = await import("@/components/editor/PanelNode");

  it("maps the panel area back to image pixels", () => {
    const image = { src: "", width: 2000, height: 1000, offsetX: -100, offsetY: -50, scale: 0.5 };
    expect(visiblePart({ w: 400, h: 300 }, image)).toEqual({ x: 200, y: 100, width: 800, height: 600 });
  });

  it("never goes outside the image", () => {
    const image = { src: "", width: 1000, height: 1000, offsetX: 1, offsetY: -1e-9, scale: 0.4 };
    const part = visiblePart({ w: 400, h: 400 }, image);
    expect(part.x).toBe(0);
    expect(part.x + part.width).toBeLessThanOrEqual(1000);
    expect(part.y + part.height).toBeLessThanOrEqual(1000);
  });
});
