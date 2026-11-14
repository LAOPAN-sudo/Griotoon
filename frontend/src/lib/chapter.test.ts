import { describe, expect, it } from "vitest";
import { copyPage, createPageLike, insertAt, moveItem, removeAt } from "./chapter";
import { createEmptyPage, createPanel } from "./page";

describe("chapter helpers", () => {
  it("moves, inserts and removes without touching the input", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(list, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(insertAt(list, 1, "x")).toEqual(["a", "x", "b", "c", "d"]);
    expect(removeAt(list, 0)).toEqual(["b", "c", "d"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("copies a page under a new id", () => {
    const page = createEmptyPage();
    page.panels.push(createPanel(page));
    const copy = copyPage(page);
    expect(copy.id).not.toBe(page.id);
    expect(copy.panels).toEqual(page.panels);
  });

  it("creates an empty page with the same settings", () => {
    const page = { ...createEmptyPage(), background: "#111111", margin: 30, gutter: 10 };
    page.panels.push(createPanel(page));
    const next = createPageLike(page);
    expect(next).toMatchObject({ background: "#111111", margin: 30, gutter: 10, width: page.width, panels: [] });
    expect(next.id).not.toBe(page.id);
  });
});
