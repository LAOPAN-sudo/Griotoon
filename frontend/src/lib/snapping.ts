// Magnetic snapping (page pixels). An edge closer than `tolerance` to a
// target line jumps onto it. Targets: page edges, page margins, edges of the
// other panels, and those edges offset by one gutter (to keep even spacing).

import type { Box } from "./geometry";

/** Snapping distance in SCREEN pixels; divide by the zoom to get page pixels. */
export const SNAP_TOLERANCE_PX = 8;

export interface SnapTargets {
  x: number[];
  y: number[];
}

export interface Guides {
  x?: number;
  y?: number;
}

export function buildSnapTargets(
  page: { width: number; height: number; margin: number; gutter: number },
  others: Box[],
): SnapTargets {
  const x = [0, page.margin, page.width - page.margin, page.width];
  const y = [0, page.margin, page.height - page.margin, page.height];
  for (const b of others) {
    x.push(b.left, b.right, b.left - page.gutter, b.right + page.gutter);
    y.push(b.top, b.bottom, b.top - page.gutter, b.bottom + page.gutter);
  }
  return { x, y };
}

/** Closest target to `value` within `tolerance`, or null. */
export function nearest(value: number, targets: number[], tolerance: number): number | null {
  let best: number | null = null;
  let bestDistance = tolerance;
  for (const t of targets) {
    const d = Math.abs(t - value);
    if (d <= bestDistance) {
      best = t;
      bestDistance = d;
    }
  }
  return best;
}

/** Snap one axis of a box: whichever of its two edges is closest to a target wins. */
function snapAxis(start: number, end: number, targets: number[], tolerance: number) {
  let delta = 0;
  let guide: number | undefined;
  let bestDistance = Infinity;
  for (const edge of [start, end]) {
    const t = nearest(edge, targets, tolerance);
    if (t !== null && Math.abs(t - edge) < bestDistance) {
      bestDistance = Math.abs(t - edge);
      delta = t - edge;
      guide = t;
    }
  }
  return { delta, guide };
}

/** How far to move a box so that it snaps, and which guide lines to show. */
export function snapBox(
  box: Box,
  targets: SnapTargets,
  tolerance: number,
): { dx: number; dy: number; guides: Guides } {
  const x = snapAxis(box.left, box.right, targets.x, tolerance);
  const y = snapAxis(box.top, box.bottom, targets.y, tolerance);
  return { dx: x.delta, dy: y.delta, guides: { x: x.guide, y: y.guide } };
}

/** Snap a single point (mouse drawing, resize handle). */
export function snapPoint(
  point: { x: number; y: number },
  targets: SnapTargets,
  tolerance: number,
): { x: number; y: number; guides: Guides } {
  const gx = nearest(point.x, targets.x, tolerance);
  const gy = nearest(point.y, targets.y, tolerance);
  return {
    x: gx ?? point.x,
    y: gy ?? point.y,
    guides: { x: gx ?? undefined, y: gy ?? undefined },
  };
}
