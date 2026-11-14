import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  DUPLICATE_OFFSET,
  editorStateCreator,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  type EditorState,
} from "./editorStore";
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

  it("puts template panels below existing bubbles and sfx", () => {
    s().addBubble(); // z 0
    s().addSfx(); // z 1
    const page = s().page;
    s().applyTemplate([createPanel(page), createPanel(page), createPanel(page)]);
    expect(s().page.panels.map((p) => p.z)).toEqual([0, 1, 2]);
    expect(s().page.bubbles[0].z).toBe(3);
    expect(s().page.sfx[0].z).toBe(4);
  });

  it("can undo a template in one step", () => {
    s().addPanel({ x: 1 });
    const page = s().page;
    s().applyTemplate([createPanel(page), createPanel(page)]);
    s().undo();
    expect(s().page.panels.map((p) => p.x)).toEqual([1]);
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

describe("batch updates, nudge and duplicate", () => {
  it("updates several elements of different types in one undo step", () => {
    const p = s().addPanel({ x: 0 });
    const b = s().addBubble({ x: 0 });
    const steps = s().past.length;
    s().updateElements([
      { id: p, patch: { x: 50 } },
      { id: b, patch: { x: 70 } },
    ]);
    expect(s().page.panels[0].x).toBe(50);
    expect(s().page.bubbles[0].x).toBe(70);
    expect(s().past.length).toBe(steps + 1);
    s().undo();
    expect(s().page.panels[0].x).toBe(0);
    expect(s().page.bubbles[0].x).toBe(0);
  });

  it("records nothing when a batch changes nothing", () => {
    const p = s().addPanel({ x: 10, y: 20 });
    const steps = s().past.length;
    s().updateElements([{ id: p, patch: { x: 10, y: 20 } }]);
    expect(s().past.length).toBe(steps);
  });

  it("nudges elements, bubble tails included", () => {
    const p = s().addPanel({ x: 100, y: 100 });
    const b = s().addBubble({ x: 10, y: 10, tail: { x: 50, y: 200 } });
    s().nudge([p, b], 10, -1);
    expect(s().page.panels[0]).toMatchObject({ x: 110, y: 99 });
    expect(s().page.bubbles[0]).toMatchObject({ x: 20, y: 9, tail: { x: 60, y: 199 } });
  });

  it("merges quick repeated nudges into one undo step", () => {
    const p = s().addPanel({ x: 100 });
    const steps = s().past.length;
    for (let i = 0; i < 30; i++) s().nudge([p], 1, 0);
    expect(s().page.panels[0].x).toBe(130);
    expect(s().past.length).toBe(steps + 1);
    s().undo();
    expect(s().page.panels[0].x).toBe(100);
  });

  it("starts a new undo step after a pause or another change", () => {
    vi.useFakeTimers();
    try {
      const p = s().addPanel({ x: 0 });
      s().nudge([p], 1, 0);
      vi.advanceTimersByTime(MERGE_WINDOW_MS + 1);
      s().nudge([p], 1, 0);
      s().updatePanel(p, { w: 10 });
      s().nudge([p], 1, 0);
      s().undo();
      expect(s().page.panels[0].x).toBe(2);
      s().undo();
      s().undo();
      expect(s().page.panels[0].x).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("duplicates with an offset, on top, and selects the copies", () => {
    const p = s().addPanel({ x: 100, y: 100 });
    const b = s().addBubble({ x: 10, y: 10, tail: { x: 50, y: 200 }, text: "Salut" });
    const ids = s().duplicate([p, b]);
    expect(ids).toHaveLength(2);
    expect(s().selectedIds).toEqual(ids);
    const panelCopy = s().page.panels[1];
    const bubbleCopy = s().page.bubbles[1];
    expect(panelCopy).toMatchObject({ x: 100 + DUPLICATE_OFFSET, y: 100 + DUPLICATE_OFFSET, z: 2 });
    expect(bubbleCopy).toMatchObject({ text: "Salut", z: 3, tail: { x: 70, y: 220 } });
    expect(panelCopy.id).not.toBe(p);
    // Copies are independent objects.
    expect(bubbleCopy.tail).not.toBe(s().page.bubbles[0].tail);
  });

  it("does nothing when duplicating unknown ids", () => {
    expect(s().duplicate(["nope"])).toEqual([]);
    expect(s().past).toHaveLength(0);
  });

  it("switches tool without touching the history", () => {
    s().setTool("panel");
    expect(s().tool).toBe("panel");
    expect(s().past).toHaveLength(0);
  });
});

describe("panel images and crop sessions", () => {
  const image = { src: "data:image/webp;base64,AAAA", width: 800, height: 600, offsetX: 0, offsetY: 0, scale: 1 };

  it("puts an image in a panel and selects it, in one undo step", () => {
    const p = s().addPanel();
    s().select(null);
    s().setPanelImage(p, image);
    expect(s().page.panels[0].image).toEqual(image);
    expect(s().selectedIds).toEqual([p]);
    s().undo();
    expect(s().page.panels[0].image).toBeNull();
  });

  it("ignores unknown panels", () => {
    s().setPanelImage("nope", image);
    expect(s().past).toHaveLength(0);
  });

  it("saves a whole crop session as one undo step", () => {
    const p = s().addPanel();
    s().setPanelImage(p, image);
    const steps = s().past.length;

    s().startCrop(p);
    expect(s().crop?.panelId).toBe(p);
    s().updateCrop({ ...image, offsetX: -10 });
    s().updateCrop({ ...image, offsetX: -20, scale: 1.5 });
    // Nothing saved yet: the page still has the original crop.
    expect(s().page.panels[0].image?.offsetX).toBe(0);

    s().endCrop();
    expect(s().crop).toBeNull();
    expect(s().page.panels[0].image).toMatchObject({ offsetX: -20, scale: 1.5 });
    expect(s().past.length).toBe(steps + 1);
    s().undo();
    expect(s().page.panels[0].image?.offsetX).toBe(0);
  });

  it("discards the session on undo, and adds no step when nothing changed", () => {
    const p = s().addPanel();
    s().setPanelImage(p, image);
    const steps = s().past.length;
    s().startCrop(p);
    s().updateCrop({ ...image, offsetX: -50 });
    s().undo(); // cancels the session only
    expect(s().crop).toBeNull();
    expect(s().page.panels[0].image?.offsetX).toBe(0);
    expect(s().page.panels[0].image).not.toBeNull();

    s().startCrop(p);
    s().endCrop();
    expect(s().past.length).toBe(steps);
  });

  it("does not crop a panel without image", () => {
    const p = s().addPanel();
    s().startCrop(p);
    expect(s().crop).toBeNull();
  });

  it("ends the session when switching tool or deleting the panel", () => {
    const p = s().addPanel();
    s().setPanelImage(p, image);
    s().startCrop(p);
    s().updateCrop({ ...image, offsetY: -5 });
    s().setTool("panel");
    expect(s().crop).toBeNull();
    expect(s().page.panels[0].image?.offsetY).toBe(-5);

    s().startCrop(p);
    s().removeElement(p);
    expect(s().crop).toBeNull();
    expect(s().page.panels).toHaveLength(0);
  });
});
