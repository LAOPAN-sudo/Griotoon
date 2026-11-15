// Local save of the page in the browser (IndexedDB), before any server sync.
// IndexedDB is used rather than localStorage because pages hold images
// (WebP dataURLs, decision #9): localStorage is limited to about 5 MB and
// blocks the page while writing, IndexedDB allows hundreds of MB.

import { del, get, set } from "idb-keyval";
import { nanoid } from "nanoid";
import { createChapter } from "./chapter";
import type { Chapter, Page } from "@/types/page";

/** Where the page is kept. An interface, so tests can use memory instead of IndexedDB. */
export interface PageStorage {
  load(): Promise<unknown>;
  save(record: SavedPage): Promise<void>;
  clear(): Promise<void>;
}

/**
 * What is written: the chapter, the page being edited (0 = cover) and the
 * time of the save. Older versions are still read (see parseSavedPage) so
 * nothing is lost: 1 = a single page (step 9), 2 = pages without cover.
 */
export interface SavedPage {
  version: 3;
  savedAt: number;
  chapter: Chapter;
  currentPage: number;
}

const KEY = "griotoon:current-page";

export const idbPageStorage: PageStorage = {
  load: () => get(KEY),
  save: (record) => set(KEY, record),
  clear: () => del(KEY),
};

/** In-memory storage, for tests. */
export function memoryPageStorage(initial?: unknown): PageStorage & { data: unknown } {
  const storage = {
    data: initial,
    load: async () => storage.data,
    save: async (record: SavedPage) => {
      storage.data = record;
    },
    clear: async () => {
      storage.data = undefined;
    },
  };
  return storage;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isPage(page: unknown): page is Page {
  if (!isObject(page) || page.version !== 1) return false;
  if (!isNumber(page.width) || !isNumber(page.height) || typeof page.background !== "string") return false;
  if (!isNumber(page.margin) || !isNumber(page.gutter)) return false;
  for (const list of [page.panels, page.bubbles, page.sfx]) {
    if (!Array.isArray(list)) return false;
    if (!list.every((el) => isObject(el) && typeof el.id === "string" && isNumber(el.x) && isNumber(el.y) && isNumber(el.z))) {
      return false;
    }
  }
  return true;
}

/** Pages saved before step 11 have no id. */
const withId = (page: Page): Page => (typeof page.id === "string" && page.id ? page : { ...page, id: nanoid(8) });

/**
 * Check a saved record before restoring it. Returns null for anything that
 * does not look like a chapter (nothing saved, another format, corrupted
 * data), so the editor starts on an empty page instead of crashing.
 * Older records get a new cover, with `heading` as its title text.
 */
export function parseSavedPage(data: unknown, heading = "CHAPITRE 1"): SavedPage | null {
  if (!isObject(data) || !isNumber(data.savedAt)) return null;
  const savedAt = data.savedAt;
  const clampIndex = (index: unknown, count: number) =>
    isNumber(index) ? Math.max(0, Math.min(count, Math.round(index))) : 1;

  if (data.version === 1) {
    if (!isPage(data.page)) return null;
    return { version: 3, savedAt, chapter: createChapter([withId(data.page)], { heading }), currentPage: 1 };
  }

  if (!isObject(data.chapter) || data.chapter.version !== 1) return null;
  const pages = data.chapter.pages;
  if (!Array.isArray(pages) || pages.length === 0 || !pages.every(isPage)) return null;

  if (data.version === 2) {
    // Same pages, now after a new cover: indexes shift by one.
    const chapter = createChapter(pages.map(withId), { heading });
    const current = isNumber(data.currentPage) ? data.currentPage + 1 : 1;
    return { version: 3, savedAt, chapter, currentPage: clampIndex(current, pages.length) };
  }

  if (data.version !== 3) return null;
  const { number, title, cover } = data.chapter;
  if (!isNumber(number) || typeof title !== "string" || !isPage(cover)) return null;
  return {
    version: 3,
    savedAt,
    chapter: { version: 1, number, title, cover: withId(cover), pages: pages.map(withId) },
    currentPage: clampIndex(data.currentPage, pages.length),
  };
}
