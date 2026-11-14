// Pure helpers for the pages of a chapter. They return new arrays and never
// mutate their input (the store keeps them as undo snapshots).

import { nanoid } from "nanoid";
import type { Chapter, Page } from "@/types/page";
import { createEmptyPage } from "./page";

export function createChapter(pages: Page[] = [createEmptyPage()]): Chapter {
  return { version: 1, pages };
}

/** A new empty page with the same format and settings as `model` (size, background, margin, gutter). */
export function createPageLike(model: Page): Page {
  const { width, height, background, margin, gutter } = model;
  return { ...createEmptyPage(), width, height, background, margin, gutter };
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
