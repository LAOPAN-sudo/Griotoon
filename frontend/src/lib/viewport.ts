// Pure maths for the editor view (zoom and pan). The view maps page pixels to
// screen pixels: screen = page * scale + (x, y).

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface View {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
/** Empty space kept around the page when fitting it to the screen. */
export const FIT_PADDING = 40;
/** Zoom factor of the + / − buttons. */
export const ZOOM_STEP = 1.25;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Largest scale that shows the whole page, centred in the viewport. */
export function fitView(viewport: Size, page: Size, padding = FIT_PADDING): View {
  const availableWidth = Math.max(viewport.width - 2 * padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * padding, 1);
  const scale = clampScale(
    Math.min(availableWidth / page.width, availableHeight / page.height),
  );
  return {
    scale,
    x: (viewport.width - page.width * scale) / 2,
    y: (viewport.height - page.height * scale) / 2,
  };
}

/** Zoom to `scale` while keeping the page point under `anchor` (screen coords) fixed. */
export function zoomAt(view: View, anchor: Point, scale: number): View {
  const next = clampScale(scale);
  const pageX = (anchor.x - view.x) / view.scale;
  const pageY = (anchor.y - view.y) / view.scale;
  return { scale: next, x: anchor.x - pageX * next, y: anchor.y - pageY * next };
}

/**
 * Zoom factor for a wheel event. Exponential so that many small trackpad
 * deltas and one big mouse-wheel notch feel the same. Large deltas are capped.
 */
export function wheelZoomFactor(deltaY: number): number {
  const capped = Math.max(-100, Math.min(100, deltaY));
  return Math.exp(-capped * 0.002);
}

/** Wheel deltas in pixels, whatever unit the browser used (Firefox may use lines). */
export function wheelDeltaPixels(
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">,
  pageHeight = 800,
): Point {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  return { x: event.deltaX * unit, y: event.deltaY * unit };
}
