import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave, type SaveStatus } from "./autosave";
import { createChapter } from "./chapter";
import { createEmptyPage } from "./page";
import { memoryPageStorage, parseSavedPage, type PageStorage, type SavedPage } from "./pageStorage";
import type { Page } from "@/types/page";

function setup(storage: PageStorage = memoryPageStorage()) {
  let page: Page = createEmptyPage();
  const listeners = new Set<() => void>();
  const statuses: SaveStatus[] = [];
  const autosave = createAutosave({
    storage,
    getData: () => ({ chapter: { ...createChapter([page]), pages: [page] }, currentPage: 1 }),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    onStatus: (s) => statuses.push(s),
    now: () => 1234,
  });
  const change = (patch: Partial<Page>) => {
    page = { ...page, ...patch };
    listeners.forEach((l) => l());
  };
  return { autosave, change, statuses, storage, listeners };
}

describe("autosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for a 1 s pause, then saves the latest page once", async () => {
    const storage = memoryPageStorage();
    const save = vi.spyOn(storage, "save");
    const { change, statuses } = setup(storage);
    change({ margin: 10 });
    await vi.advanceTimersByTimeAsync(600);
    change({ margin: 20 });
    await vi.advanceTimersByTimeAsync(600);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(save).toHaveBeenCalledTimes(1);
    expect((storage.data as SavedPage).chapter.pages[0].margin).toBe(20);
    expect((storage.data as SavedPage).savedAt).toBe(1234);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("flush saves right away and does nothing without changes", async () => {
    const storage = memoryPageStorage();
    const save = vi.spyOn(storage, "save");
    const { autosave, change } = setup(storage);
    await autosave.flush();
    expect(save).not.toHaveBeenCalled();
    change({ gutter: 5 });
    expect(autosave.hasUnsavedChanges()).toBe(true);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.hasUnsavedChanges()).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1); // the pending timer was cancelled
  });

  it("writes changes made during a save afterwards, never in parallel", async () => {
    let release!: () => void;
    const storage = memoryPageStorage();
    const writes: number[] = [];
    let active = 0;
    storage.save = vi.fn(async (record: SavedPage) => {
      active++;
      expect(active).toBe(1);
      await new Promise<void>((r) => (release = r));
      writes.push(record.chapter.pages[0].margin);
      active--;
    });
    const { autosave, change, statuses } = setup(storage);
    change({ margin: 1 });
    const first = autosave.flush();
    change({ margin: 2 });
    const second = autosave.flush();
    release();
    await first;
    await vi.waitFor(() => expect(storage.save).toHaveBeenCalledTimes(2));
    release();
    await second;
    expect(writes).toEqual([1, 2]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("reports an error and retries on the next flush", async () => {
    const storage = memoryPageStorage();
    storage.save = vi.fn().mockRejectedValueOnce(new Error("quota")).mockResolvedValue(undefined);
    const { autosave, change, statuses } = setup(storage);
    change({ margin: 3 });
    await autosave.flush();
    expect(statuses.at(-1)).toBe("error");
    expect(autosave.hasUnsavedChanges()).toBe(true);
    await autosave.flush();
    expect(storage.save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("stops listening once disposed", async () => {
    const { autosave, listeners } = setup();
    autosave.dispose();
    expect(listeners.size).toBe(0);
  });
});

describe("parseSavedPage", () => {
  const record = (page: unknown) => ({ version: 1, savedAt: 1, page });

  it("accepts a saved chapter with its cover, number, title and page being edited", () => {
    const chapter = { ...createChapter([createEmptyPage(), createEmptyPage()]), number: 4, title: "Le marché" };
    const saved = parseSavedPage({ version: 3, savedAt: 5, chapter, currentPage: 2 });
    expect(saved?.chapter).toEqual(chapter);
    expect(saved?.currentPage).toBe(2);
    // An out-of-range page index is clamped (0 = cover … 2 = last page).
    expect(parseSavedPage({ version: 3, savedAt: 5, chapter, currentPage: 9 })?.currentPage).toBe(2);
    expect(parseSavedPage({ version: 3, savedAt: 5, chapter: { ...chapter, cover: null }, currentPage: 0 })).toBeNull();
  });

  it("gives older saves a cover: one page (step 9) or pages without cover (step 11)", () => {
    const { id: _id, ...oldPage } = createEmptyPage();
    void _id;
    const fromOne = parseSavedPage(record(oldPage), "CHAPTER 1");
    expect(fromOne?.version).toBe(3);
    expect(fromOne?.chapter.pages).toHaveLength(1);
    expect(fromOne?.chapter.pages[0].id).toEqual(expect.any(String));
    expect(fromOne?.chapter.cover.sfx[0].text).toBe("CHAPTER 1");
    expect(fromOne?.currentPage).toBe(1);

    const pages = [createEmptyPage(), createEmptyPage()];
    const fromTwo = parseSavedPage({ version: 2, savedAt: 1, chapter: { version: 1, pages }, currentPage: 1 });
    expect(fromTwo?.chapter.pages).toEqual(pages);
    expect(fromTwo?.chapter.cover.panels).toHaveLength(1);
    expect(fromTwo?.currentPage).toBe(2); // the same page, now after the cover
  });

  it("rejects missing or damaged data", () => {
    const page = createEmptyPage();
    expect(parseSavedPage(undefined)).toBeNull();
    expect(parseSavedPage("hello")).toBeNull();
    expect(parseSavedPage({ ...record(page), version: 2 })).toBeNull();
    expect(parseSavedPage(record({ ...page, version: 2 }))).toBeNull();
    expect(parseSavedPage(record({ ...page, panels: null }))).toBeNull();
    expect(parseSavedPage(record({ ...page, bubbles: [{ id: "b", x: "1", y: 0, z: 0 }] }))).toBeNull();
    expect(parseSavedPage({ version: 2, savedAt: 1, chapter: { version: 1, pages: [] }, currentPage: 0 })).toBeNull();
    expect(parseSavedPage({ version: 2, savedAt: 1, chapter: { version: 1, pages: [page, { ...page, panels: 3 }] } })).toBeNull();
  });
});
