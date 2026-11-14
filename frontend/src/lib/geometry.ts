// Geometry helpers in page pixels.

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Rotatable {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, around the (x, y) corner as in Konva. */
  rotation: number;
}

/** Axis-aligned bounding box of a rectangle rotated around its (x, y) corner. */
export function boundsOf(r: Rotatable): Box {
  const a = (r.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [dx, dy] of [
    [0, 0],
    [r.w, 0],
    [0, r.h],
    [r.w, r.h],
  ]) {
    xs.push(r.x + dx * cos - dy * sin);
    ys.push(r.y + dx * sin + dy * cos);
  }
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

/** Normalised rectangle from two corners (drawing with the mouse in any direction). */
export function rectFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/** Convert a page point into a panel's local coordinates (undoing its rotation). */
export function toLocal(r: Rotatable, point: { x: number; y: number }): { x: number; y: number } {
  const a = (-r.rotation * Math.PI) / 180;
  const dx = point.x - r.x;
  const dy = point.y - r.y;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Convert a point from a panel's local coordinates back to page coordinates. */
export function fromLocal(r: Pick<Rotatable, "x" | "y" | "rotation">, local: { x: number; y: number }) {
  const a = (r.rotation * Math.PI) / 180;
  return {
    x: r.x + local.x * Math.cos(a) - local.y * Math.sin(a),
    y: r.y + local.x * Math.sin(a) + local.y * Math.cos(a),
  };
}

/** Centre of a rotated rectangle, in page coordinates. */
export function centerOf(r: Rotatable) {
  return fromLocal(r, { x: r.w / 2, y: r.h / 2 });
}

export function containsPoint(r: Rotatable, point: { x: number; y: number }): boolean {
  const local = toLocal(r, point);
  return local.x >= 0 && local.x <= r.w && local.y >= 0 && local.y <= r.h;
}

/** Topmost element (highest z) containing the point, if any. */
export function topmostAt<T extends Rotatable & { z: number }>(
  items: T[],
  point: { x: number; y: number },
): T | undefined {
  return [...items].sort((a, b) => b.z - a.z).find((item) => containsPoint(item, point));
}
