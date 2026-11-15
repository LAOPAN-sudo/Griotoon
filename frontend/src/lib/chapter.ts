// Pure helpers for the chapter: cover, pages, copies, moves. They return new
// objects and never mutate their input (the store keeps them as undo snapshots).

import { nanoid } from "nanoid";
import type { Chapter, Page } from "@/types/page";
import { createEmptyPage, createSfx } from "./page";
import { getTemplate } from "./templates";

/** A new empty page with the same format and settings as `model` (size, background, margin, gutter). */
export function createPageLike(model: Page): Page {
  const { width, height, background, margin, gutter } = model;
  return { ...createEmptyPage(), width, height, background, margin, gutter };
}

/**
 * A new cover: the "Cover" template (full-page illustration panel) and the
 * chapter heading as editable outlined text at the top.
 */
export function createCover(model: Page, heading: string): Page {
  const page = createPageLike(model);
  const panels = getTemplate("cover").build(page);
  const withPanels = { ...page, panels };
  const title = createSfx(withPanels, {
    text: heading,
    x: Math.round(page.width * 0.1),
    y: Math.round(page.height * 0.06),
    fontSize: 120,
    rotation: 0,
    color: "#FFFFFF",
    strokeColor: "#000000",
  });
  return { ...withPanels, sfx: [title] };
}

export function createChapter(pages: Page[] = [createEmptyPage()], options: { number?: number; title?: string; heading?: string } = {}): Chapter {
  const number = options.number ?? 1;
  const story = pages.length > 0 ? pages : [createEmptyPage()];
  return {
    version: 1,
    number,
    title: options.title ?? "",
    cover: createCover(story[0], options.heading ?? `CHAPITRE ${number}`),
    pages: story,
  };
}

/**
 * A copy of a page under a new id. Elements keep their ids: they only need
 * to be unique within a page. Pages are immutable, so the copy can share
 * the element arrays (and the heavy image data) with the original.
 */
export function copyPage(page: Page): Page {
  return { ...page, id: nanoid(8) };
}

export function insertAt<T>(list: T[], index: number, item: T): T[] {
  const i = Math.max(0, Math.min(list.length, index));
  return [...list.slice(0, i), item, ...list.slice(i)];
}

export function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Move the item at `from` so it ends at index `to` (clamped). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (target === from) return list;
  const rest = removeAt(list, from);
  return insertAt(rest, target, list[from]);
}

/**
 * Pages shown two by two as in the printed book: the cover alone, then
 * spreads of story pages (1–2, 3–4…). Values are indexes in [cover, ...pages].
 */
export function spreads(storyPageCount: number): number[][] {
  const result: number[][] = [[0]];
  for (let n = 1; n <= storyPageCount; n += 2) result.push(n + 1 <= storyPageCount ? [n, n + 1] : [n]);
  return result;
}
