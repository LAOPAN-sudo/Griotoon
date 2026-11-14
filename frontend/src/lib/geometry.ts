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
