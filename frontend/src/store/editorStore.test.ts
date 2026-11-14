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

describe("bubbles", () => {
  it("creates bubbles of each type with the right defaults", () => {
    s().addBubble({ type: "narration", x: 0, y: 0 });
    s().addBubble({ type: "shout", x: 0, y: 0 });
    const [narration, shout] = s().page.bubbles;
    expect(narration.tail).toBeUndefined();
    expect(shout.tail).toEqual({ x: shout.w * 0.3, y: shout.h + 90 });
    expect(shout.fontFamily).toBe("Comic Neue");
  });

  it("changes bubble types in one step, removing or adding the tail", () => {
    const a = s().addBubble({ type: "speech" });
    const b = s().addBubble({ type: "narration" });
    const steps = s().past.length;

    s().setBubbleType([a, b], "narration");
    expect(s().page.bubbles.map((x) => x.type)).toEqual(["narration", "narration"]);
    expect(s().page.bubbles[0].tail).toBeUndefined();
    expect(s().past.length).toBe(steps + 1);
    expect(s().newBubbleType).toBe("narration");

    s().setBubbleType([a], "thought");
    expect(s().page.bubbles[0].tail).toBeDefined();
    s().undo();
    s().undo();
    expect(s().page.bubbles[0].type).toBe("speech");
  });

  it("remembers the type for new bubbles even without a selection", () => {
    s().setBubbleType([], "shout");
    expect(s().newBubbleType).toBe("shout");
    expect(s().past).toHaveLength(0);
  });

  it("opens the text field of a bubble and closes it", () => {
    const b = s().addBubble();
    s().setTool("bubble");
    s().startEditing(b);
    expect(s().editingId).toBe(b);
    expect(s().selectedIds).toEqual([b]);
    expect(s().tool).toBe("select");
    s().stopEditing();
    expect(s().editingId).toBeNull();
    s().startEditing("nope");
    expect(s().editingId).toBeNull();
  });

  it("closes the text field when the bubble is deleted", () => {
    const b = s().addBubble();
    s().startEditing(b);
    s().removeElement(b);
    expect(s().editingId).toBeNull();
  });
});

describe("page settings and hidden elements", () => {
  it("updates page settings in one step and ignores no-ops", () => {
    s().updatePage({ margin: 80, gutter: 30, background: "#FFF8E7" });
    expect(s().page).toMatchObject({ margin: 80, gutter: 30, background: "#FFF8E7" });
    const steps = s().past.length;
    s().updatePage({ margin: 80 });
    expect(s().past.length).toBe(steps);
    s().undo();
    expect(s().page.margin).toBe(60);
  });

  it("hides and shows elements, deselecting hidden ones", () => {
    const p = s().addPanel();
    const b = s().addBubble();
    s().select([p, b]);
    s().setHidden([p], true);
    expect(s().page.panels[0].hidden).toBe(true);
    expect(s().selectedIds).toEqual([b]);
    s().setHidden([p], false);
    expect("hidden" in s().page.panels[0]).toBe(false); // no "hidden: false" left in the JSON
    s().undo();
    expect(s().page.panels[0].hidden).toBe(true);
  });
});

describe("pages of the chapter", () => {
  const ids = () => s().pages.map((p) => p.id);

  it("starts with one page, which is the page being edited", () => {
    expect(s().pages).toHaveLength(1);
    expect(s().page).toBe(s().pages[0]);
  });

  it("edits only the current page", () => {
    s().addPage();
    s().addPanel();
    expect(s().currentPage).toBe(1);
    expect(s().pages[1].panels).toHaveLength(1);
    expect(s().pages[0].panels).toHaveLength(0);
    expect(s().page).toBe(s().pages[1]);
  });

  it("adds an empty page after the current one, with the same settings", () => {
    s().updatePage({ background: "#FFF8E7", margin: 80 });
    s().addPanel();
    s().addPage();
    expect(s().pages).toHaveLength(2);
    expect(s().page).toMatchObject({ background: "#FFF8E7", margin: 80, panels: [] });
    expect(s().page.id).not.toBe(s().pages[0].id);
  });

  it("duplicates a page right after it and shows the copy", () => {
    s().addPanel();
    s().addPage();
    s().goToPage(0);
    s().duplicatePage();
    expect(s().pages).toHaveLength(3);
    expect(s().currentPage).toBe(1);
    expect(s().page.panels).toEqual(s().pages[0].panels);
    expect(new Set(ids()).size).toBe(3);
    // Editing the copy leaves the original untouched.
    s().addPanel();
    expect(s().pages[0].panels).toHaveLength(1);
    expect(s().pages[1].panels).toHaveLength(2);
  });

  it("deletes a page but never the last one", () => {
    s().removePage(0);
    expect(s().pages).toHaveLength(1);
    s().addPage();
    s().addPage(); // pages: 0, 1, 2 — showing 2
    const [a, b, c] = ids();
    s().removePage(0);
    expect(ids()).toEqual([b, c]);
    expect(s().page.id).toBe(c); // still the same page
    s().removePage(1); // the page being edited: its neighbour is shown
    expect(ids()).toEqual([b]);
    expect(s().currentPage).toBe(0);
    void a;
  });

  it("moves a page and keeps editing the same one", () => {
    s().addPage();
    s().addPage();
    const [a, b, c] = ids();
    s().goToPage(0);
    s().movePage(0, 2);
    expect(ids()).toEqual([b, c, a]);
    expect(s().currentPage).toBe(2);
    expect(s().page.id).toBe(a);
  });

  it("changing page clears the selection and is not an undo step", () => {
    s().addPage();
    const steps = s().past.length;
    s().select(s().addPanel());
    s().goToPage(0);
    expect(s().selectedIds).toEqual([]);
    expect(s().past.length).toBe(steps + 1); // only the panel
  });

  it("undoes page operations and shows the page where the change happened", () => {
    s().addPanel(); // on page 1
    s().addPage();
    s().addPage();
    expect(s().pages).toHaveLength(3);
    s().removePage(0);
    expect(s().pages).toHaveLength(2);
    s().undo();
    expect(s().pages).toHaveLength(3);
    expect(s().pages[0].panels).toHaveLength(1);
    // Undo an edit on page 1 while page 3 is shown: page 1 comes back on screen.
    s().goToPage(0);
    s().addSfx();
    s().goToPage(2);
    s().undo();
    expect(s().currentPage).toBe(0);
    expect(s().page.sfx).toHaveLength(0);
    s().redo();
    expect(s().page.sfx).toHaveLength(1);
  });

  it("undo and redo of a new page show the page it concerns", () => {
    s().addPage();
    const added = s().page.id;
    s().undo();
    expect(s().pages).toHaveLength(1);
    expect(s().currentPage).toBe(0);
    s().redo();
    expect(s().page.id).toBe(added);
    expect(s().currentPage).toBe(1);
    s().undo();
    s().redo();
    expect(s().currentPage).toBe(1);
  });

  it("ends a crop session before changing page", () => {
    s().select(s().addPanel());
    const id = s().selectedIds[0];
    s().setPanelImage(id, { src: "data:x", width: 100, height: 100, offsetX: 0, offsetY: 0, scale: 2 });
    s().startCrop(id);
    s().updateCrop({ src: "data:x", width: 100, height: 100, offsetX: -10, offsetY: 0, scale: 2 });
    s().addPage();
    expect(s().crop).toBeNull();
    expect(s().pages[0].panels[0].image?.offsetX).toBe(-10);
  });

  it("loads a chapter and returns it for saving", () => {
    const pages = [createEmptyPage(), createEmptyPage()];
    s().addPanel();
    s().loadChapter({ version: 1, pages }, 1);
    expect(s().page).toBe(pages[1]);
    expect(s().past).toEqual([]);
    expect(s().getChapter()).toEqual({ version: 1, pages });
  });
});

describe("reset page", () => {
  it("empties the current page only, keeps its settings, in one undo step", () => {
    s().updatePage({ background: "#111111", margin: 90 });
    s().addPanel();
    s().addPage();
    s().select([s().addPanel(), s().addBubble(), s().addSfx()]);
    const steps = s().past.length;
    s().resetPage();
    expect(s().page).toMatchObject({ panels: [], bubbles: [], sfx: [], background: "#111111", margin: 90 });
    expect(s().pages[0].panels).toHaveLength(1);
    expect(s().selectedIds).toEqual([]);
    expect(s().past.length).toBe(steps + 1);
    s().undo();
    expect(s().page.panels).toHaveLength(1);
    expect(s().page.bubbles).toHaveLength(1);
    expect(s().page.sfx).toHaveLength(1);
  });

  it("does nothing on an empty page", () => {
    s().resetPage();
    expect(s().past).toEqual([]);
  });
});
