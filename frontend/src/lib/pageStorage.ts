// Local save of the page in the browser (IndexedDB), before any server sync.
// IndexedDB is used rather than localStorage because pages hold images
// (WebP dataURLs, decision #9): localStorage is limited to about 5 MB and
// blocks the page while writing, IndexedDB allows hundreds of MB.

import { del, get, set } from "idb-keyval";
import type { Page } from "@/types/page";

/** Where the page is kept. An interface, so tests can use memory instead of IndexedDB. */
export interface PageStorage {
  load(): Promise<unknown>;
  save(record: SavedPage): Promise<void>;
  clear(): Promise<void>;
}

/** What is written: the page plus the time of the save. */
export interface SavedPage {
  version: 1;
  savedAt: number;
  page: Page;
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

/**
 * Check a saved record before restoring it. Returns null for anything that
 * does not look like a page (nothing saved, another format, corrupted data),
 * so the editor starts on an empty page instead of crashing.
 */
export function parseSavedPage(data: unknown): SavedPage | null {
  if (!isObject(data) || data.version !== 1 || !isNumber(data.savedAt)) return null;
  const page = data.page;
  if (!isObject(page) || page.version !== 1) return null;
  if (!isNumber(page.width) || !isNumber(page.height) || typeof page.background !== "string") return null;
  if (!isNumber(page.margin) || !isNumber(page.gutter)) return null;
  for (const list of [page.panels, page.bubbles, page.sfx]) {
    if (!Array.isArray(list)) return null;
    if (!list.every((el) => isObject(el) && typeof el.id === "string" && isNumber(el.x) && isNumber(el.y) && isNumber(el.z))) {
      return null;
    }
  }
  return data as unknown as SavedPage;
}
