import { describe, expect, it } from "vitest";
import { boundsOf, rectFromPoints } from "./geometry";
import { buildSnapTargets, nearest, snapBox, snapPoint } from "./snapping";
import { createEmptyPage } from "./page";

const page = createEmptyPage(); // 1240 × 1754, margin 60, gutter 20

describe("geometry", () => {
  it("returns the box of an unrotated rectangle", () => {
    expect(boundsOf({ x: 10, y: 20, w: 100, h: 50, rotation: 0 })).toEqual({
      left: 10,
      top: 20,
      right: 110,
      bottom: 70,
    });
  });

  it("returns the box of a rectangle rotated 90° around its corner", () => {
    const b = boundsOf({ x: 100, y: 100, w: 50, h: 20, rotation: 90 });
    expect(b.left).toBeCloseTo(80);
    expect(b.right).toBeCloseTo(100);
    expect(b.top).toBeCloseTo(100);
    expect(b.bottom).toBeCloseTo(150);
  });

  it("normalises a rectangle drawn in any direction", () => {
    expect(rectFromPoints({ x: 300, y: 400 }, { x: 100, y: 150 })).toEqual({ x: 100, y: 150, w: 200, h: 250 });
  });
});

describe("snapping", () => {
  const other = { left: 60, top: 60, right: 1180, bottom: 560 };
  const targets = buildSnapTargets(page, [other]);

  it("includes page edges, margins, other panels and gutter offsets", () => {
    expect(targets.x).toEqual(expect.arrayContaining([0, 60, 1180, 1240]));
    expect(targets.y).toEqual(expect.arrayContaining([560, 580]));
  });

  it("finds the nearest target within the tolerance only", () => {
    expect(nearest(63, [0, 60, 100], 8)).toBe(60);
    expect(nearest(75, [0, 60, 100], 8)).toBeNull();
  });

  it("snaps a box below another panel, one gutter apart", () => {
    // Top edge at 585: 5 px from the "bottom + gutter" line (580).
    const box = { left: 300, top: 585, right: 700, bottom: 900 };
    const r = snapBox(box, targets, 8);
    expect(r.dy).toBe(-5);
    expect(r.guides.y).toBe(580);
  });

  it("snaps with the right edge when it is the closest", () => {
    const box = { left: 500, top: 700, right: 1176, bottom: 900 };
    const r = snapBox(box, targets, 8);
    expect(r.dx).toBe(4);
    expect(r.guides.x).toBe(1180);
  });

  it("leaves a box alone when nothing is close", () => {
    const r = snapBox({ left: 300, top: 700, right: 600, bottom: 1000 }, targets, 8);
    expect(r).toEqual({ dx: 0, dy: 0, guides: { x: undefined, y: undefined } });
  });

  it("snaps a point on each axis independently", () => {
    expect(snapPoint({ x: 57, y: 1000 }, targets, 8)).toEqual({ x: 60, y: 1000, guides: { x: 60, y: undefined } });
  });
});
