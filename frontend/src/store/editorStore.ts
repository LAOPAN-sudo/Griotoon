import { create, type StateCreator } from "zustand";
import { produce, type Draft } from "immer";
import { nanoid } from "nanoid";
import type { Bubble, BubbleType, Chapter, Page, PageElement, Panel, PanelImage, Sfx } from "@/types/page";
import { copyPage, createChapter, createPageLike, insertAt, moveItem, removeAt } from "@/lib/chapter";
import { defaultTail } from "@/lib/bubbles";
import { allElements, createBubble, createEmptyPage, createPanel, createSfx, nextZ } from "@/lib/page";

export const HISTORY_LIMIT = 100;
/** Consecutive changes with the same merge key within this delay form one undo step. */
export const MERGE_WINDOW_MS = 1000;
/** Offset of duplicated elements, in page pixels. */
export const DUPLICATE_OFFSET = 20;

type Patch<T> = Partial<Omit<T, "id">>;
/** Patch for any element type (panel, bubble or sfx). */
export type ElementPatch = Patch<Panel> | Patch<Bubble> | Patch<Sfx>;

/** Active editor tool. */
export type Tool = "select" | "panel" | "bubble" | "sfx";

/**
 * Image crop session (double-click on a panel with an image). Changes are
 * kept here while the user moves and zooms the image, then saved as ONE undo
 * step when the session ends.
 */
export interface CropSession {
  panelId: string;
  image: PanelImage;
}

/**
 * One undo step: the pages of the chapter, the page to show with them, and
 * the page shown on the other side of the step (so that undo AND redo both
 * bring the changed page back on screen).
 */
export interface Snapshot {
  pages: Page[];
  currentPage: number;
  otherPage: number;
}

export interface EditorState {
  /** Pages of the chapter, in reading order. */
  pages: Page[];
  /** Index of the page being edited. */
  currentPage: number;
  /** The page being edited: always `pages[currentPage]` (kept as a field for simple selectors). */
  page: Page;
  selectedIds: string[];
  tool: Tool;
  crop: CropSession | null;
  /** Type used by the Bubble tool for the next bubble. */
  newBubbleType: BubbleType;
  /** Bubble or sound effect whose text is being edited in the overlay text field. */
  editingId: string | null;
  /** Previous snapshots, oldest first. */
  past: Snapshot[];
  /** Undone snapshots, most recently undone last. */
  future: Snapshot[];

  /** Replace the chapter (e.g. restore from storage). Clears history and selection. */
  loadChapter: (chapter: Chapter, currentPage?: number) => void;
  /** Replace everything with a one-page chapter. */
  loadPage: (page: Page) => void;
  /** The chapter as saved and exported. */
  getChapter: () => Chapter;

  /** Show another page (not an undo step). */
  goToPage: (index: number) => void;
  /** Add an empty page (same format and settings) after the current one and show it. */
  addPage: () => void;
  /** Copy a page (the current one by default) right after it and show the copy. */
  duplicatePage: (index?: number) => void;
  /** Delete a page. The last remaining page cannot be deleted. */
  removePage: (index: number) => void;
  /** Move a page to another position; the page being edited stays the same. */
  movePage: (from: number, to: number) => void;
  /** Remove every element of the current page (panels, images, bubbles, sfx); its settings stay. */
  resetPage: () => void;

  addPanel: (props?: Partial<Panel>) => string;
  updatePanel: (id: string, patch: Patch<Panel>) => void;
  addBubble: (props?: Partial<Bubble>) => string;
  updateBubble: (id: string, patch: Patch<Bubble>) => void;
  addSfx: (props?: Partial<Sfx>) => string;
  updateSfx: (id: string, patch: Patch<Sfx>) => void;
  /** Update several elements of any type in a single undo step. */
  updateElements: (patches: { id: string; patch: ElementPatch }[], mergeKey?: string) => void;
  /** Move elements by (dx, dy). Repeated nudges of the same selection merge into one undo step. */
  nudge: (ids: string[], dx: number, dy: number) => void;
  /** Copy elements with a small offset and select the copies. Returns the new ids. */
  duplicate: (ids: string[]) => string[];
  /** Remove panels, bubbles or sfx by id. */
  removeElement: (ids: string | string[]) => void;
  /** Replace all panels with the ones produced by a layout template. */
  applyTemplate: (panels: Panel[]) => void;
  /** Set z order from a list of ids, bottom first. Unlisted elements keep their z. */
  reorder: (orderedIds: string[]) => void;

  /** Select ids. With `additive`, toggle them in the current selection (Shift+click). */
  select: (ids: string | string[] | null, additive?: boolean) => void;

  setTool: (tool: Tool) => void;

  /** Page settings (background, margin, gutter). */
  /** Change page settings. Changes with the same `mergeKey` within a second form one undo step. */
  updatePage: (patch: Partial<Pick<Page, "background" | "margin" | "gutter">>, mergeKey?: string) => void;
  /** Hide or show elements (layers panel eye). Hidden elements are deselected. */
  setHidden: (ids: string[], hidden: boolean) => void;

  /** Change the type of bubbles (adds or removes the tail as needed). Also the default for new ones. */
  setBubbleType: (ids: string[], type: BubbleType) => void;
  /** Open / close the text field of a bubble or sound effect. */
  startEditing: (id: string) => void;
  stopEditing: () => void;

  /** Put an image in a panel (or remove it with null). Selects the panel. */
  setPanelImage: (panelId: string, image: PanelImage | null) => void;
  /** Start cropping a panel's image. Does nothing if the panel has no image. */
  startCrop: (panelId: string) => void;
  /** Update the image during a crop session (no history entry). */
  updateCrop: (image: PanelImage) => void;
  /** End the crop session, saving it (default) or discarding it. */
  endCrop: (save?: boolean) => void;

  undo: () => void;
  redo: () => void;
}

const toArray = (ids: string | string[] | null): string[] =>
  ids === null ? [] : Array.isArray(ids) ? ids : [ids];

export const editorStateCreator: StateCreator<EditorState> = (set, get) => {
  /**
   * Apply a change to the page and record the previous version in history.
   * Immer gives us immutable snapshots with structural sharing, so keeping
   * 100 of them stays cheap.
   */
  let lastMerge: { key: string; time: number } | null = null;

  const commit = (recipe: (draft: Draft<Page>) => void, mergeKey?: string) => {
    const { page, pages, currentPage, past } = get();
    const next = produce(page, recipe);
    if (next === page) return; // nothing changed: no history entry

    const now = Date.now();
    const merge =
      mergeKey !== undefined &&
      lastMerge?.key === mergeKey &&
      now - lastMerge.time < MERGE_WINDOW_MS &&
      past.length > 0;
    lastMerge = mergeKey === undefined ? null : { key: mergeKey, time: now };

    const nextPages = pages.slice();
    nextPages[currentPage] = next;
    set({
      page: next,
      pages: nextPages,
      // When merging, the step before the first change stays the undo target.
      past: merge ? past : [...past, { pages, currentPage, otherPage: currentPage }].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  /**
   * Change the list of pages (add, copy, delete, move) as one undo step, and
   * show `currentPage`. Callers end any crop session first, so that `pages`
   * includes it.
   */
  const commitPages = (pages: Page[], currentPage: number) => {
    lastMerge = null;
    const before = get();
    set({
      pages,
      currentPage,
      page: pages[currentPage],
      past: [...before.past, { pages: before.pages, currentPage: before.currentPage, otherPage: currentPage }].slice(-HISTORY_LIMIT),
      future: [],
      selectedIds: currentPage === before.currentPage && pages[currentPage] === before.page ? before.selectedIds : [],
      editingId: null,
    });
  };

  /** Show a snapshot (undo / redo). The selection is kept for elements still on the same page. */
  const restore = (snapshot: Snapshot) => {
    const { selectedIds, currentPage, page } = get();
    const next = snapshot.pages[snapshot.currentPage];
    const samePage = snapshot.currentPage === currentPage && next.id === page.id;
    const existing = new Set(allElements(next).map((el) => el.id));
    set({
      pages: snapshot.pages,
      currentPage: snapshot.currentPage,
      page: next,
      selectedIds: samePage ? selectedIds.filter((id) => existing.has(id)) : [],
      editingId: null,
    });
  };

  const findElement = (d: Draft<Page>, id: string): Draft<PageElement> | undefined =>
    d.panels.find((p) => p.id === id) ??
    d.bubbles.find((b) => b.id === id) ??
    d.sfx.find((s) => s.id === id);

  const firstPage = createEmptyPage();
  return {
    pages: [firstPage],
    currentPage: 0,
    page: firstPage,
    selectedIds: [],
    tool: "select",
    crop: null,
    newBubbleType: "speech",
    editingId: null,
    past: [],
    future: [],

    loadChapter: (chapter, currentPage = 0) => {
      lastMerge = null;
      const pages = chapter.pages.length > 0 ? chapter.pages : [createEmptyPage()];
      const index = Math.max(0, Math.min(pages.length - 1, currentPage));
      set({ pages, currentPage: index, page: pages[index], selectedIds: [], past: [], future: [], crop: null, editingId: null });
    },

    loadPage: (page) => get().loadChapter(createChapter([page])),

    getChapter: () => createChapter(get().pages),

    goToPage: (index) => {
      const { pages, currentPage } = get();
      if (index === currentPage || index < 0 || index >= pages.length) return;
      get().endCrop();
      lastMerge = null;
      // Read the pages again: ending a crop session may have changed the current page.
      const latest = get().pages;
      set({ currentPage: index, page: latest[index], selectedIds: [], editingId: null });
    },

    addPage: () => {
      get().endCrop();
      const { pages, currentPage, page } = get();
      commitPages(insertAt(pages, currentPage + 1, createPageLike(page)), currentPage + 1);
    },

    duplicatePage: (index) => {
      get().endCrop();
      const { pages, currentPage } = get();
      const i = index ?? currentPage;
      if (!pages[i]) return;
      commitPages(insertAt(pages, i + 1, copyPage(pages[i])), i + 1);
    },

    removePage: (index) => {
      get().endCrop();
      const { pages, currentPage } = get();
      if (pages.length <= 1 || !pages[index]) return;
      const next = removeAt(pages, index);
      // Keep showing the same page; if it was the deleted one, show its neighbour.
      const current = index < currentPage ? currentPage - 1 : Math.min(currentPage, next.length - 1);
      commitPages(next, current);
    },

    movePage: (from, to) => {
      get().endCrop();
      const { pages, page } = get();
      const next = moveItem(pages, from, to);
      if (next === pages) return;
      commitPages(next, next.findIndex((p) => p.id === page.id));
    },

    addPanel: (props) => {
      const panel = createPanel(get().page, props);
      commit((d) => {
        d.panels.push(panel);
      });
      return panel.id;
    },

    updatePanel: (id, patch) =>
      commit((d) => {
        const panel = d.panels.find((p) => p.id === id);
        if (panel) Object.assign(panel, patch);
      }),

    addBubble: (props) => {
      const bubble = createBubble(get().page, props);
      commit((d) => {
        d.bubbles.push(bubble);
      });
      return bubble.id;
    },

    updateBubble: (id, patch) =>
      commit((d) => {
        const bubble = d.bubbles.find((b) => b.id === id);
        if (bubble) Object.assign(bubble, patch);
      }),

    addSfx: (props) => {
      const sfx = createSfx(get().page, props);
      commit((d) => {
        d.sfx.push(sfx);
      });
      return sfx.id;
    },

    updateSfx: (id, patch) =>
      commit((d) => {
        const sfx = d.sfx.find((s) => s.id === id);
        if (sfx) Object.assign(sfx, patch);
      }),

    updateElements: (patches, mergeKey) =>
      commit((d) => {
        for (const { id, patch } of patches) {
          const el = findElement(d, id);
          if (!el) continue;
          // Only assign changed values so that a no-op leaves the page untouched.
          for (const [key, value] of Object.entries(patch)) {
            const k = key as keyof typeof el;
            if (el[k] !== value) (el as Record<string, unknown>)[key] = value;
          }
        }
      }, mergeKey),

    nudge: (ids, dx, dy) => {
      if (ids.length === 0 || (dx === 0 && dy === 0)) return;
      commit((d) => {
        for (const id of ids) {
          const el = findElement(d, id);
          if (!el) continue;
          el.x += dx;
          el.y += dy;
          if ("tail" in el && el.tail) {
            el.tail.x += dx;
            el.tail.y += dy;
          }
        }
      }, `nudge:${[...ids].sort().join(",")}`);
    },

    duplicate: (ids) => {
      const { page } = get();
      const wanted = new Set(ids);
      const sources = allElements(page)
        .filter((el) => wanted.has(el.id))
        .sort((a, b) => a.z - b.z); // keep their relative order, on top of everything
      if (sources.length === 0) return [];

      let z = nextZ(page);
      const copies = sources.map((el) => {
        const copy = structuredClone(el) as PageElement;
        copy.id = nanoid(8);
        copy.x += DUPLICATE_OFFSET;
        copy.y += DUPLICATE_OFFSET;
        copy.z = z++;
        if ("tail" in copy && copy.tail) {
          copy.tail = { x: copy.tail.x + DUPLICATE_OFFSET, y: copy.tail.y + DUPLICATE_OFFSET };
        }
        return copy;
      });
      const panelIds = new Set(page.panels.map((p) => p.id));
      const bubbleIds = new Set(page.bubbles.map((b) => b.id));
      commit((d) => {
        sources.forEach((source, i) => {
          if (panelIds.has(source.id)) d.panels.push(copies[i] as Panel);
          else if (bubbleIds.has(source.id)) d.bubbles.push(copies[i] as Bubble);
          else d.sfx.push(copies[i] as Sfx);
        });
      });
      const newIds = copies.map((c) => c.id);
      set({ selectedIds: newIds });
      return newIds;
    },

    removeElement: (ids) => {
      get().endCrop(false);
      const toRemove = new Set(toArray(ids));
      const { page } = get();
      if (!allElements(page).some((el) => toRemove.has(el.id))) return;
      commit((d) => {
        d.panels = d.panels.filter((p) => !toRemove.has(p.id));
        d.bubbles = d.bubbles.filter((b) => !toRemove.has(b.id));
        d.sfx = d.sfx.filter((s) => !toRemove.has(s.id));
        // Bubbles attached to a deleted panel stay on the page, detached.
        for (const b of d.bubbles) {
          if (b.panelId && toRemove.has(b.panelId)) delete b.panelId;
        }
      });
      set({
        selectedIds: get().selectedIds.filter((id) => !toRemove.has(id)),
        editingId: toRemove.has(get().editingId ?? "") ? null : get().editingId,
      });
    },

    applyTemplate: (panels) => {
      get().endCrop(false);
      const oldIds = new Set(get().page.panels.map((p) => p.id));
      commit((d) => {
        // New panels go below everything else, in template order; the other
        // elements keep their relative order on top.
        d.panels = panels.map((p, index) => ({ ...p, z: index }));
        const others = [...d.bubbles, ...d.sfx].sort((a, b) => a.z - b.z);
        others.forEach((el, index) => {
          el.z = panels.length + index;
        });
        for (const b of d.bubbles) {
          if (b.panelId && oldIds.has(b.panelId)) delete b.panelId;
        }
      });
      set({ selectedIds: get().selectedIds.filter((id) => !oldIds.has(id)) });
    },

    reorder: (orderedIds) =>
      commit((d) => {
        const zById = new Map(orderedIds.map((id, index) => [id, index]));
        for (const el of [...d.panels, ...d.bubbles, ...d.sfx]) {
          const z = zById.get(el.id);
          if (z !== undefined && el.z !== z) el.z = z;
        }
      }),

    select: (ids, additive = false) => {
      const list = toArray(ids);
      if (!additive) {
        set({ selectedIds: list });
        return;
      }
      const current = new Set(get().selectedIds);
      for (const id of list) {
        if (current.has(id)) current.delete(id);
        else current.add(id);
      }
      set({ selectedIds: [...current] });
    },

    setTool: (tool) => {
      get().endCrop();
      set({ tool });
    },

    updatePage: (patch, mergeKey) =>
      commit((d) => {
        for (const [key, value] of Object.entries(patch)) {
          const k = key as keyof typeof patch;
          if (value !== undefined && d[k] !== value) (d as Record<string, unknown>)[k] = value;
        }
      }, mergeKey),

    setHidden: (ids, hidden) => {
      const wanted = new Set(ids);
      commit((d) => {
        for (const el of [...d.panels, ...d.bubbles, ...d.sfx]) {
          if (!wanted.has(el.id) || !!el.hidden === hidden) continue;
          if (hidden) el.hidden = true;
          else delete el.hidden;
        }
      });
      if (hidden) set({ selectedIds: get().selectedIds.filter((id) => !wanted.has(id)) });
    },

    setBubbleType: (ids, type) => {
      set({ newBubbleType: type });
      const wanted = new Set(ids);
      commit((d) => {
        for (const b of d.bubbles) {
          if (!wanted.has(b.id) || b.type === type) continue;
          b.type = type;
          if (type === "narration") delete b.tail;
          else if (!b.tail) b.tail = defaultTail(b);
        }
      });
    },

    startEditing: (id) => {
      const { page } = get();
      if (!page.bubbles.some((b) => b.id === id) && !page.sfx.some((x) => x.id === id)) return;
      get().endCrop();
      set({ editingId: id, selectedIds: [id], tool: "select" });
    },

    stopEditing: () => set({ editingId: null }),

    setPanelImage: (panelId, image) => {
      get().endCrop(false);
      if (!get().page.panels.some((p) => p.id === panelId)) return;
      commit((d) => {
        const panel = d.panels.find((p) => p.id === panelId);
        if (panel) panel.image = image;
      });
      set({ selectedIds: [panelId] });
    },

    startCrop: (panelId) => {
      const { crop, page } = get();
      if (crop?.panelId === panelId) return;
      get().endCrop();
      const panel = page.panels.find((p) => p.id === panelId);
      if (!panel?.image) return;
      set({ crop: { panelId, image: panel.image }, selectedIds: [panelId], tool: "select" });
    },

    updateCrop: (image) => {
      const { crop } = get();
      if (crop) set({ crop: { ...crop, image } });
    },

    endCrop: (save = true) => {
      const { crop } = get();
      if (!crop) return;
      set({ crop: null });
      if (save) {
        commit((d) => {
          const panel = d.panels.find((p) => p.id === crop.panelId);
          if (panel?.image) Object.assign(panel.image, crop.image);
        });
      }
    },

    resetPage: () => {
      get().endCrop(false);
      commit((d) => {
        if (d.panels.length) d.panels = [];
        if (d.bubbles.length) d.bubbles = [];
        if (d.sfx.length) d.sfx = [];
      });
      set({ selectedIds: [], editingId: null });
    },

    undo: () => {
      // During a crop session, undo just cancels the session.
      if (get().crop) {
        get().endCrop(false);
        return;
      }
      lastMerge = null;
      const { pages, past, future } = get();
      const previous = past.at(-1);
      if (!previous) return;
      const redoStep = { pages, currentPage: previous.otherPage, otherPage: previous.currentPage };
      set({ past: past.slice(0, -1), future: [...future, redoStep] });
      restore(previous);
    },

    redo: () => {
      if (get().crop) {
        get().endCrop(false);
        return;
      }
      lastMerge = null;
      const { pages, past, future } = get();
      const next = future.at(-1);
      if (!next) return;
      const undoStep = { pages, currentPage: next.otherPage, otherPage: next.currentPage };
      set({ past: [...past, undoStep].slice(-HISTORY_LIMIT), future: future.slice(0, -1) });
      restore(next);
    },
  };
};

export const useEditorStore = create<EditorState>()(editorStateCreator);
