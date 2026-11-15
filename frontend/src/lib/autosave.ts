// Automatic save: waits for a pause of `delay` ms after the last change, then
// writes the page. Pure logic (no React, no IndexedDB) so it can be tested
// with fake timers.

import type { PageStorage, SavedPage } from "./pageStorage";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutosaveOptions {
  storage: PageStorage;
  /** What to save: the chapter and the page being edited. */
  getData: () => Pick<SavedPage, "chapter" | "currentPage">;
  /** Called with a listener; must return an unsubscribe function. The listener is called on each page change. */
  subscribe: (listener: () => void) => () => void;
  onStatus: (status: SaveStatus, info: { savedAt?: number; error?: unknown }) => void;
  delay?: number;
  now?: () => number;
}

export interface Autosave {
  /** Save now if there are unsaved changes (e.g. when the tab is hidden). */
  flush: () => Promise<void>;
  /** True while changes are not written yet. */
  hasUnsavedChanges: () => boolean;
  dispose: () => void;
}

export const AUTOSAVE_DELAY_MS = 1000;

export function createAutosave({
  storage,
  getData,
  subscribe,
  onStatus,
  delay = AUTOSAVE_DELAY_MS,
  now = Date.now,
}: AutosaveOptions): Autosave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  /** The save in progress, so two writes never overlap. */
  let running: Promise<void> | null = null;
  let disposed = false;

  const write = async (): Promise<void> => {
    if (running) {
      // A save is in progress: wait for it, then write the latest page if needed.
      await running;
      if (dirty) return write();
      return;
    }
    if (!dirty) return;
    dirty = false;
    const data = getData();
    const savedAt = now();
    onStatus("saving", {});
    running = storage
      .save({ version: 3, savedAt, ...data })
      .then(
        () => {
          if (!disposed) onStatus(dirty ? "pending" : "saved", { savedAt });
        },
        (error: unknown) => {
          dirty = true; // keep the changes: the next edit or flush retries
          if (!disposed) onStatus("error", { error });
        },
      )
      .finally(() => {
        running = null;
      });
    return running;
  };

  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    await write();
  };

  const unsubscribe = subscribe(() => {
    dirty = true;
    onStatus("pending", {});
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void write();
    }, delay);
  });

  return {
    flush,
    hasUnsavedChanges: () => dirty || running !== null,
    dispose: () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    },
  };
}
