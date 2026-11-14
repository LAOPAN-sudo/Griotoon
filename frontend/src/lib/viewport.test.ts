import { beforeEach, describe, expect, it } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  clampScale,
  fitView,
  MAX_SCALE,
  MIN_SCALE,
  wheelDeltaPixels,
  wheelZoomFactor,
  zoomAt,
  ZOOM_STEP,
} from "./viewport";
import { viewStateCreator, type ViewState } from "@/store/viewStore";

const A4 = { width: 1240, height: 1754 };

describe("fitView", () => {
  it("fits a portrait page by its height and centres it", () => {
    const view = fitView({ width: 1600, height: 900 }, A4, 40);
    expect(view.scale).toBeCloseTo(820 / 1754);
    expect(view.y).toBeCloseTo(40);
    expect(view.x).toBeCloseTo((1600 - 1240 * view.scale) / 2);
  });

  it("fits by width on a narrow screen", () => {
    const view = fitView({ width: 400, height: 2000 }, A4, 20);
    expect(view.scale).toBeCloseTo(360 / 1240);
    expect(view.x).toBeCloseTo(20);
  });

  it("never returns a scale outside the limits", () => {
    expect(fitView({ width: 10, height: 10 }, A4).scale).toBe(MIN_SCALE);
    expect(fitView({ width: 100000, height: 100000 }, A4).scale).toBe(MAX_SCALE);
  });
});

describe("zoomAt", () => {
  it("keeps the page point under the cursor fixed", () => {
    const view = { scale: 0.5, x: 100, y: 50 };
    const anchor = { x: 400, y: 300 };
    const before = { x: (anchor.x - view.x) / view.scale, y: (anchor.y - view.y) / view.scale };
    const next = zoomAt(view, anchor, 1.5);
    expect(next.scale).toBe(1.5);
    expect(before.x * next.scale + next.x).toBeCloseTo(anchor.x);
    expect(before.y * next.scale + next.y).toBeCloseTo(anchor.y);
  });

  it("clamps the scale", () => {
    expect(zoomAt({ scale: 1, x: 0, y: 0 }, { x: 0, y: 0 }, 100).scale).toBe(MAX_SCALE);
    expect(clampScale(0)).toBe(MIN_SCALE);
  });
});

describe("wheel helpers", () => {
  it("zooms in when scrolling up, out when scrolling down", () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(0)).toBe(1);
  });

  it("caps very large deltas", () => {
    expect(wheelZoomFactor(10000)).toBe(wheelZoomFactor(100));
  });

  it("converts line deltas to pixels", () => {
    expect(wheelDeltaPixels({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toEqual({ x: 0, y: 48 });
    expect(wheelDeltaPixels({ deltaX: 5, deltaY: 7, deltaMode: 0 })).toEqual({ x: 5, y: 7 });
  });
});

describe("view store", () => {
  let store: StoreApi<ViewState>;
  const s = () => store.getState();
  beforeEach(() => {
    store = createStore<ViewState>()(viewStateCreator);
  });

  it("fits the page when the viewport is first measured", () => {
    s().setViewport({ width: 1600, height: 900 }, A4);
    expect(s().view).toEqual(fitView({ width: 1600, height: 900 }, A4));
  });

  it("keeps refitting on resize until the user zooms", () => {
    s().setViewport({ width: 1600, height: 900 }, A4);
    s().setViewport({ width: 800, height: 600 }, A4);
    expect(s().view).toEqual(fitView({ width: 800, height: 600 }, A4));

    s().zoomIn();
    const zoomed = s().view;
    s().setViewport({ width: 1000, height: 700 }, A4);
    expect(s().view).toEqual(zoomed);
    expect(s().autoFit).toBe(false);
  });

  it("zooms around the viewport centre with the buttons", () => {
    s().setViewport({ width: 1000, height: 800 }, A4);
    const start = s().view.scale;
    s().zoomIn();
    expect(s().view.scale).toBeCloseTo(start * ZOOM_STEP);
    s().zoomOut();
    expect(s().view.scale).toBeCloseTo(start);
  });

  it("pans and refits on demand", () => {
    s().setViewport({ width: 1000, height: 800 }, A4);
    const fitted = s().view;
    s().panBy(30, -20);
    expect(s().view.x).toBeCloseTo(fitted.x + 30);
    expect(s().view.y).toBeCloseTo(fitted.y - 20);
    s().fit(A4);
    expect(s().view).toEqual(fitted);
    expect(s().autoFit).toBe(true);
  });
});
