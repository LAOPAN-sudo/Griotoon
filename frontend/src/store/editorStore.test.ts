import { beforeEach, describe, expect, it } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import { editorStateCreator, HISTORY_LIMIT, type EditorState } from "./editorStore";
import { createEmptyPage, createPanel } from "@/lib/page";

let store: StoreApi<EditorState>;
const s = () => store.getState();

beforeEach(() => {
  store = createStore<EditorState>()(editorStateCreator);
});

describe("adding elements", () => {
  it("adds a panel with defaults and returns its id", () => {
    const id = s().addPanel({ x: 100, y: 120 });
    const panel = s().page.panels[0];
    expect(panel.id).toBe(id);
    expect(panel).toMatchObject({ x: 100, y: 120, image: null, rotation: 0, characters: [] });
  });

  it("stacks new elements on top (increasing z)", () => {
    s().addPanel();
    s().addBubble();
    s().addSfx();
    const { panels, bubbles, sfx } = s().page;
    expect([panels[0].z, bubbles[0].z, sfx[0].z]).toEqual([0, 1, 2]);
  });

  it("gives narration bubbles no tail", () => {
    s().addBubble({ type: "narration" });
    s().addBubble({ type: "speech" });
    expect(s().page.bubbles[0].tail).toBeUndefined();
    expect(s().page.bubbles[1].tail).toBeDefined();
  });
});

describe("updating elements", () => {
  it("updates a panel, a bubble and an sfx", () => {
    const p = s().addPanel();
    const b = s().addBubble();
    const x = s().addSfx();
    s().updatePanel(p, { w: 999 });
    s().updateBubble(b, { text: "Vite, le marché ouvre déjà !" });
    s().updateSfx(x, { rotation: 30 });
    expect(s().page.panels[0].w).toBe(999);
    expect(s().page.bubbles[0].text).toBe("Vite, le marché ouvre déjà !");
    expect(s().page.sfx[0].rotation).toBe(30);
  });

  it("does not record history when nothing changes", () => {
    const p = s().addPanel({ w: 500 });
    const before = s().past.length;
    s().updatePanel(p, { w: 500 });
    s().updatePanel("unknown", { w: 1 });
    expect(s().past.length).toBe(before);
  });

  it("never mutates the previous page object", () => {
    const p = s().addPanel({ w: 500 });
    const snapshot = s().page;
    s().updatePanel(p, { w: 600 });
    expect(snapshot.panels[0].w).toBe(500);
  });
});

describe("removing elements", () => {
  it("removes elements, deselects them and detaches their bubbles", () => {
    const p = s().addPanel();
    const b = s().addBubble({ panelId: p });
    s().select([p, b]);
    s().removeElement(p);
    expect(s().page.panels).toHaveLength(0);
    expect(s().page.bubbles[0].panelId).toBeUndefined();
    expect(s().selectedIds).toEqual([b]);
  });

  it("ignores unknown ids", () => {
    s().addPanel();
    const before = s().past.length;
    s().removeElement("nope");
    expect(s().past.length).toBe(before);
  });
});

describe("templates and ordering", () => {
  it("replaces all panels when applying a template", () => {
    const old = s().addPanel();
    s().addBubble({ panelId: old });
    const page = s().page;
    const fresh = [createPanel(page, { x: 0 }), createPanel(page, { x: 500 })];
    s().applyTemplate(fresh);
    expect(s().page.panels.map((p) => p.x)).toEqual([0, 500]);
    expect(s().page.bubbles[0].panelId).toBeUndefined();
  });

  it("reorders z from a list of ids, bottom first", () => {
    const a = s().addPanel();
    const b = s().addBubble();
    s().reorder([b, a]);
    expect(s().page.bubbles[0].z).toBe(0);
    expect(s().page.panels[0].z).toBe(1);
  });
});

describe("selection", () => {
  it("replaces or toggles the selection", () => {
    s().select("a");
    expect(s().selectedIds).toEqual(["a"]);
    s().select("b", true);
    expect(s().selectedIds).toEqual(["a", "b"]);
    s().select("a", true);
    expect(s().selectedIds).toEqual(["b"]);
    s().select(null);
    expect(s().selectedIds).toEqual([]);
  });

  it("is not part of the undo history", () => {
    s().select("a");
    expect(s().past).toHaveLength(0);
  });
});

describe("undo / redo", () => {
  it("undoes and redoes changes in order", () => {
    const p = s().addPanel({ w: 100 });
    s().updatePanel(p, { w: 200 });

    s().undo();
    expect(s().page.panels[0].w).toBe(100);
    s().undo();
    expect(s().page.panels).toHaveLength(0);
    s().undo(); // nothing left: no-op
    expect(s().page.panels).toHaveLength(0);

    s().redo();
    s().redo();
    expect(s().page.panels[0].w).toBe(200);
    s().redo(); // nothing left: no-op
    expect(s().page.panels[0].w).toBe(200);
  });

  it("clears the redo stack after a new change", () => {
    s().addPanel();
    s().undo();
    expect(s().future).toHaveLength(1);
    s().addBubble();
    expect(s().future).toHaveLength(0);
  });

  it("drops selected ids that no longer exist after undo", () => {
    const p = s().addPanel();
    s().select(p);
    s().undo();
    expect(s().selectedIds).toEqual([]);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    const p = s().addPanel({ w: 0 });
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) s().updatePanel(p, { w: i });
    expect(s().past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) s().undo();
    expect(s().page.panels[0].w).toBe(20);
  });

  it("loadPage resets history and selection", () => {
    s().addPanel();
    s().select("x");
    s().loadPage(createEmptyPage());
    expect(s().past).toHaveLength(0);
    expect(s().future).toHaveLength(0);
    expect(s().selectedIds).toEqual([]);
    expect(s().page.panels).toHaveLength(0);
  });
});
