import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave, type SaveStatus } from "./autosave";
import { createEmptyPage } from "./page";
import { memoryPageStorage, parseSavedPage, type PageStorage, type SavedPage } from "./pageStorage";
import type { Page } from "@/types/page";

function setup(storage: PageStorage = memoryPageStorage()) {
  let page: Page = createEmptyPage();
  const listeners = new Set<() => void>();
  const statuses: SaveStatus[] = [];
  const autosave = createAutosave({
    storage,
    getPage: () => page,
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
    expect((storage.data as SavedPage).page.margin).toBe(20);
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
      writes.push(record.page.margin);
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

  it("accepts a saved page", () => {
    const page = createEmptyPage();
    expect(parseSavedPage(record(page))?.page).toBe(page);
  });

  it("rejects missing or damaged data", () => {
    const page = createEmptyPage();
    expect(parseSavedPage(undefined)).toBeNull();
    expect(parseSavedPage("hello")).toBeNull();
    expect(parseSavedPage({ ...record(page), version: 2 })).toBeNull();
    expect(parseSavedPage(record({ ...page, version: 2 }))).toBeNull();
    expect(parseSavedPage(record({ ...page, panels: null }))).toBeNull();
    expect(parseSavedPage(record({ ...page, bubbles: [{ id: "b", x: "1", y: 0, z: 0 }] }))).toBeNull();
  });
});
