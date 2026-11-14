// Panel layout templates: pure functions (page) => Panel[].
// They fill the page area inside `margin`, with `gutter` between panels.

import type { Page, Panel } from "@/types/page";
import type { MessageKey } from "@/i18n/fr";
import { createPanel } from "./page";

export type TemplateId =
  | "full"
  | "two-strips"
  | "three-strips"
  | "grid-2x2"
  | "manga-classic"
  | "action"
  | "webtoon";

export interface Template {
  id: TemplateId;
  /** Translation key of the template name. */
  nameKey: MessageKey;
  build: (page: Page) => Panel[];
}

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees. The panel is shrunk so it stays inside its slot once rotated. */
  rotation?: number;
}

/** A row of the layout: relative height and relative widths of its panels. */
interface RowSpec {
  weight: number;
  cols: number[];
  /** Rotation (degrees) applied to every panel of the row. */
  rotation?: number;
}

/** Split `total` into parts proportional to `weights`, separated by `gap`. */
function split(total: number, weights: number[], gap: number): { start: number; size: number }[] {
  const free = total - gap * (weights.length - 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return weights.map((w) => {
    const size = (free * w) / sum;
    const part = { start: cursor, size };
    cursor += size + gap;
    return part;
  });
}

/** Lay out rows of panels inside the page margins. */
export function rowsToSlots(page: Page, rows: RowSpec[], rowGap = page.gutter): Slot[] {
  const x0 = page.margin;
  const y0 = page.margin;
  const width = page.width - 2 * page.margin;
  const height = page.height - 2 * page.margin;

  return split(height, rows.map((r) => r.weight), rowGap).flatMap((row, i) =>
    split(width, rows[i].cols, page.gutter).map((col) => ({
      x: x0 + col.start,
      y: y0 + row.start,
      w: col.size,
      h: row.size,
      rotation: rows[i].rotation,
    })),
  );
}

/**
 * Turn a slot into panel geometry. For a rotated panel, find the largest
 * rectangle whose rotated bounding box exactly fills the slot, centred in it.
 * Konva rotates around (x, y), the top-left corner, so we compute that corner.
 */
export function slotToGeometry(slot: Slot): Pick<Panel, "x" | "y" | "w" | "h" | "rotation"> {
  const rotation = slot.rotation ?? 0;
  if (rotation === 0) {
    return { x: Math.round(slot.x), y: Math.round(slot.y), w: Math.round(slot.w), h: Math.round(slot.h), rotation: 0 };
  }
  const a = (Math.abs(rotation) * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // Bounding box of a w × h rect rotated by a: (w c + h s) × (w s + h c).
  const det = c * c - s * s;
  const w = (slot.w * c - slot.h * s) / det;
  const h = (slot.h * c - slot.w * s) / det;
  const cx = slot.x + slot.w / 2;
  const cy = slot.y + slot.h / 2;
  const r = (rotation * Math.PI) / 180;
  const x = cx - ((w / 2) * Math.cos(r) - (h / 2) * Math.sin(r));
  const y = cy - ((w / 2) * Math.sin(r) + (h / 2) * Math.cos(r));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation };
}

function fromRows(rows: RowSpec[], rowGap?: (page: Page) => number) {
  return (page: Page): Panel[] =>
    rowsToSlots(page, rows, rowGap?.(page)).map((slot, index) =>
      createPanel(page, { ...slotToGeometry(slot), z: index }),
    );
}

export const TEMPLATES: Template[] = [
  {
    id: "full",
    nameKey: "templates.full",
    build: fromRows([{ weight: 1, cols: [1] }]),
  },
  {
    id: "two-strips",
    nameKey: "templates.twoStrips",
    build: fromRows([
      { weight: 1, cols: [1] },
      { weight: 1, cols: [1] },
    ]),
  },
  {
    id: "three-strips",
    nameKey: "templates.threeStrips",
    build: fromRows([
      { weight: 1, cols: [1] },
      { weight: 1, cols: [1] },
      { weight: 1, cols: [1] },
    ]),
  },
  {
    id: "grid-2x2",
    nameKey: "templates.grid2x2",
    build: fromRows([
      { weight: 1, cols: [1, 1] },
      { weight: 1, cols: [1, 1] },
    ]),
  },
  {
    id: "manga-classic",
    nameKey: "templates.mangaClassic",
    // One big panel on top, two in the middle, one at the bottom.
    build: fromRows([
      { weight: 1.3, cols: [1] },
      { weight: 1, cols: [1, 1] },
      { weight: 1, cols: [1] },
    ]),
  },
  {
    id: "action",
    nameKey: "templates.action",
    // Five panels; the middle one is tilted for a dynamic effect.
    build: fromRows([
      { weight: 1, cols: [1.4, 1] },
      { weight: 1.1, cols: [1], rotation: -4 },
      { weight: 1, cols: [1, 1.4] },
    ]),
  },
  {
    id: "webtoon",
    nameKey: "templates.webtoon",
    // Full-width panels stacked with wider gaps, as in vertical scrolling.
    build: fromRows(
      [
        { weight: 1, cols: [1] },
        { weight: 1.4, cols: [1] },
        { weight: 1, cols: [1] },
      ],
      (page) => page.gutter * 3,
    ),
  },
];

export function getTemplate(id: TemplateId): Template {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  return template;
}
