// Local save of the page in the browser (IndexedDB), before any server sync.
// IndexedDB is used rather than localStorage because pages hold images
// (WebP dataURLs, decision #9): localStorage is limited to about 5 MB and
// blocks the page while writing, IndexedDB allows hundreds of MB.

import { del, get, set } from "idb-keyval";
import { nanoid } from "nanoid";
import type { Chapter, Page } from "@/types/page";

/** Where the page is kept. An interface, so tests can use memory instead of IndexedDB. */
export interface PageStorage {
  load(): Promise<unknown>;
  save(record: SavedPage): Promise<void>;
  clear(): Promise<void>;
}

/**
 * What is written: the chapter, the page being edited and the time of the
 * save. Version 1 (step 9) held a single page; it is still read (see
 * parseSavedPage) so nothing is lost.
 */
export interface SavedPage {
  version: 2;
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
 * A version 1 record (one page) becomes a one-page chapter.
 */
export function parseSavedPage(data: unknown): SavedPage | null {
  if (!isObject(data) || !isNumber(data.savedAt)) return null;

  if (data.version === 1) {
    if (!isPage(data.page)) return null;
    return { version: 2, savedAt: data.savedAt, chapter: { version: 1, pages: [withId(data.page)] }, currentPage: 0 };
  }

  if (data.version !== 2 || !isObject(data.chapter) || data.chapter.version !== 1) return null;
  const pages = data.chapter.pages;
  if (!Array.isArray(pages) || pages.length === 0 || !pages.every(isPage)) return null;
  const currentPage = isNumber(data.currentPage) ? Math.max(0, Math.min(pages.length - 1, Math.round(data.currentPage))) : 0;
  return { version: 2, savedAt: data.savedAt, chapter: { version: 1, pages: pages.map(withId) }, currentPage };
}
