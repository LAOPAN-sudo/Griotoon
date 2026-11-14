import { nanoid } from "nanoid";
import type { Bubble, BubbleType, Page, PageElement, Panel, Sfx } from "@/types/page";
import { DEFAULT_BUBBLE_SIZE, defaultTail } from "./bubbles";

/** A4 at 150 dpi. */
export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1754;

export function createEmptyPage(): Page {
  return {
    version: 1,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    background: "#FFFFFF",
    gutter: 20,
    margin: 60,
    panels: [],
    bubbles: [],
    sfx: [],
  };
}

export function allElements(page: Page): PageElement[] {
  return [...page.panels, ...page.bubbles, ...page.sfx];
}

/** z value that puts a new element on top of everything else. */
export function nextZ(page: Page): number {
  const zs = allElements(page).map((el) => el.z);
  return zs.length === 0 ? 0 : Math.max(...zs) + 1;
}

export function createPanel(page: Page, props: Partial<Panel> = {}): Panel {
  return {
    id: nanoid(8),
    x: page.margin,
    y: page.margin,
    w: 400,
    h: 300,
    rotation: 0,
    border: { width: 4, color: "#000000" },
    image: null,
    characters: [],
    z: nextZ(page),
    ...props,
  };
}

export function createBubble(
  page: Page,
  props: Partial<Bubble> & { type?: BubbleType } = {},
): Bubble {
  const type = props.type ?? "speech";
  const x = props.x ?? 400;
  const y = props.y ?? 200;
  const w = props.w ?? DEFAULT_BUBBLE_SIZE[type].w;
  const h = props.h ?? DEFAULT_BUBBLE_SIZE[type].h;
  return {
    id: nanoid(8),
    type,
    x,
    y,
    w,
    h,
    // Narration boxes have no tail. Others point down-left by default.
    tail: type === "narration" ? undefined : defaultTail({ x, y, w, h }),
    text: "",
    fontFamily: "Comic Neue",
    fontSize: 28,
    align: "center",
    z: nextZ(page),
    ...props,
  };
}

export function createSfx(page: Page, props: Partial<Sfx> = {}): Sfx {
  return {
    id: nanoid(8),
    text: "BAM !",
    x: 200,
    y: 900,
    fontSize: 72,
    rotation: -12,
    color: "#C0392B",
    z: nextZ(page),
    ...props,
  };
}
