// Layers: two groups drawn in this order, bottom to top (decision n° 10):
// panels, then bubbles and sound effects. `z` orders each group.

import type { Bubble, Page, Panel, Sfx } from "@/types/page";

export type LayerItem =
  | { kind: "panel"; el: Panel }
  | { kind: "bubble"; el: Bubble }
  | { kind: "sfx"; el: Sfx };

export interface LayerGroups {
  /** Bubbles and sound effects, TOP first (as shown in the layers panel). */
  texts: LayerItem[];
  /** Panels, TOP first. */
  panels: LayerItem[];
}

const topFirst = (a: LayerItem, b: LayerItem) => b.el.z - a.el.z;

export function layerGroups(page: Page): LayerGroups {
  return {
    texts: [
      ...page.bubbles.map((el) => ({ kind: "bubble" as const, el })),
      ...page.sfx.map((el) => ({ kind: "sfx" as const, el })),
    ].sort(topFirst),
    panels: page.panels.map((el) => ({ kind: "panel" as const, el })).sort(topFirst),
  };
}

/**
 * Move `id` to position `index` in a list (top-first), as when dropping a row
 * in the layers panel. Returns the new order, BOTTOM first, ready for
 * editorStore.reorder.
 */
export function moveLayer(topFirstIds: string[], id: string, index: number): string[] {
  const without = topFirstIds.filter((x) => x !== id);
  const at = Math.max(0, Math.min(without.length, index));
  without.splice(at, 0, id);
  return without.reverse();
}
