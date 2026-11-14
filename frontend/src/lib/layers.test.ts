import { describe, expect, it } from "vitest";
import { createBubble, createEmptyPage, createPanel, createSfx } from "./page";
import { layerGroups, moveLayer } from "./layers";

describe("layer groups", () => {
  it("keeps texts and panels apart, top first", () => {
    const page = createEmptyPage();
    page.panels = [createPanel(page, { id: "p1", z: 0 }), createPanel(page, { id: "p2", z: 5 })];
    page.bubbles = [createBubble(page, { id: "b1", z: 3 })];
    page.sfx = [createSfx(page, { id: "s1", z: 7 })];
    const groups = layerGroups(page);
    expect(groups.texts.map((l) => l.el.id)).toEqual(["s1", "b1"]);
    expect(groups.panels.map((l) => l.el.id)).toEqual(["p2", "p1"]);
    expect(groups.texts.map((l) => l.kind)).toEqual(["sfx", "bubble"]);
  });
});

describe("moveLayer", () => {
  const ids = ["a", "b", "c", "d"]; // top first

  it("moves an item and returns the order bottom first", () => {
    expect(moveLayer(ids, "d", 0)).toEqual(["c", "b", "a", "d"]); // d to the top
    expect(moveLayer(ids, "a", 3)).toEqual(["a", "d", "c", "b"]); // a to the bottom
    expect(moveLayer(ids, "b", 2)).toEqual(["d", "b", "c", "a"]);
  });

  it("clamps the target position", () => {
    expect(moveLayer(ids, "b", -5)).toEqual(["d", "c", "a", "b"]);
    expect(moveLayer(ids, "b", 99)).toEqual(["b", "d", "c", "a"]);
  });
});
