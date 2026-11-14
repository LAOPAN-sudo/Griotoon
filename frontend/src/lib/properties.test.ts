import { describe, expect, it } from "vitest";
import { createBubble, createEmptyPage, createPanel } from "./page";
import { bubbleGeometryPatch, layerText, panelGeometryPatch } from "./properties";

const page = createEmptyPage();

describe("panel geometry from the properties panel", () => {
  it("refits the image when the panel is resized", () => {
    const panel = createPanel(page, {
      w: 400,
      h: 300,
      image: { src: "x", width: 800, height: 600, offsetX: 0, offsetY: 0, scale: 0.5 },
    });
    const patch = panelGeometryPatch(panel, { w: 1000 });
    expect(patch.w).toBe(1000);
    expect(patch.image!.scale).toBeCloseTo(1000 / 800);
  });

  it("leaves the image alone when only moving", () => {
    const panel = createPanel(page, { image: { src: "x", width: 800, height: 600, offsetX: 0, offsetY: 0, scale: 1 } });
    expect(panelGeometryPatch(panel, { x: 10 })).toEqual({ x: 10 });
  });
});

describe("bubble geometry from the properties panel", () => {
  const bubble = createBubble(page, { x: 100, y: 100, w: 300, h: 150, tail: { x: 190, y: 340 } });

  it("moves the tail with the bubble", () => {
    expect(bubbleGeometryPatch(bubble, { x: 150 }).tail).toEqual({ x: 240, y: 340 });
  });

  it("rotates the tail with the bubble", () => {
    const tail = bubbleGeometryPatch(bubble, { rotation: 90 }).tail!;
    expect(tail.x).toBeCloseTo(100 - 240);
    expect(tail.y).toBeCloseTo(100 + 90);
  });

  it("keeps the tail in place when resizing", () => {
    expect(bubbleGeometryPatch(bubble, { w: 500 })).toEqual({ w: 500 });
  });
});

describe("layerText", () => {
  it("keeps short texts and shortens long ones on one line", () => {
    expect(layerText("BAM !")).toBe("BAM !");
    expect(layerText("Vite,\nle marché ouvre déjà ! Cours !", 16)).toBe("Vite, le marché…");
  });
});
