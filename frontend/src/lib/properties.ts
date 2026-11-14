// Changes made from the properties panel, as pure functions: given an element
// and the edited fields, return the full patch to apply (side effects such as
// moving a bubble's tail or refitting a panel's image included).

import type { Bubble, Panel, Sfx } from "@/types/page";
import { transformTail } from "./bubbles";
import { clampCrop } from "./image";

type Geometry = Partial<{ x: number; y: number; w: number; h: number; rotation: number }>;

export function panelGeometryPatch(panel: Panel, change: Geometry): Partial<Panel> {
  const next = { ...panel, ...change };
  const patch: Partial<Panel> = { ...change };
  // The image must keep covering a resized panel.
  if ((change.w !== undefined || change.h !== undefined) && panel.image) {
    patch.image = clampCrop(next.w, next.h, panel.image);
  }
  return patch;
}

export function bubbleGeometryPatch(bubble: Bubble, change: Geometry): Partial<Bubble> {
  const next = { ...bubble, ...change };
  const patch: Partial<Bubble> = { ...change };
  // Moving or rotating carries the tail along, as on the canvas. Resizing
  // from the panel keeps the tail where it is (it points at a character).
  if (
    bubble.tail &&
    (change.x !== undefined || change.y !== undefined || change.rotation !== undefined)
  ) {
    patch.tail = transformTail(bubble, { x: next.x, y: next.y, rotation: next.rotation });
  }
  return patch;
}

export function sfxGeometryPatch(_sfx: Sfx, change: Pick<Geometry, "x" | "y" | "rotation">): Partial<Sfx> {
  return { ...change };
}

/** Short label of a layer row. */
export function layerText(text: string, max = 24): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
