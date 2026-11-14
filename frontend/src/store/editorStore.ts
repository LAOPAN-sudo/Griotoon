import { create, type StateCreator } from "zustand";
import { produce, type Draft } from "immer";
import { nanoid } from "nanoid";
import type { Bubble, BubbleType, Page, PageElement, Panel, PanelImage, Sfx } from "@/types/page";
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

export interface EditorState {
  page: Page;
  selectedIds: string[];
  tool: Tool;
  crop: CropSession | null;
  /** Type used by the Bubble tool for the next bubble. */
  newBubbleType: BubbleType;
  /** Bubble or sound effect whose text is being edited in the overlay text field. */
  editingId: string | null;
  /** Previous page snapshots, oldest first. */
  past: Page[];
  /** Undone snapshots, most recently undone last. */
  future: Page[];

  /** Replace the page (e.g. restore from storage). Clears history and selection. */
  loadPage: (page: Page) => void;

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
    const { page, past } = get();
    const next = produce(page, recipe);
    if (next === page) return; // nothing changed: no history entry

    const now = Date.now();
    const merge =
      mergeKey !== undefined &&
      lastMerge?.key === mergeKey &&
      now - lastMerge.time < MERGE_WINDOW_MS &&
      past.length > 0;
    lastMerge = mergeKey === undefined ? null : { key: mergeKey, time: now };

    set({
      page: next,
      // When merging, the step before the first change stays the undo target.
      past: merge ? past : [...past, page].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  const findElement = (d: Draft<Page>, id: string): Draft<PageElement> | undefined =>
    d.panels.find((p) => p.id === id) ??
    d.bubbles.find((b) => b.id === id) ??
    d.sfx.find((s) => s.id === id);

  return {
    page: createEmptyPage(),
    selectedIds: [],
    tool: "select",
    crop: null,
    newBubbleType: "speech",
    editingId: null,
    past: [],
    future: [],

    loadPage: (page) => {
      lastMerge = null;
      set({ page, selectedIds: [], past: [], future: [], crop: null, editingId: null });
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

    undo: () => {
      // During a crop session, undo just cancels the session.
      if (get().crop) {
        get().endCrop(false);
        return;
      }
      lastMerge = null;
      const { page, past, future, selectedIds } = get();
      const previous = past.at(-1);
      if (!previous) return;
      const existing = new Set(allElements(previous).map((el) => el.id));
      set({
        page: previous,
        past: past.slice(0, -1),
        future: [...future, page],
        selectedIds: selectedIds.filter((id) => existing.has(id)),
      });
    },

    redo: () => {
      if (get().crop) {
        get().endCrop(false);
        return;
      }
      lastMerge = null;
      const { page, past, future, selectedIds } = get();
      const next = future.at(-1);
      if (!next) return;
      const existing = new Set(allElements(next).map((el) => el.id));
      set({
        page: next,
        past: [...past, page].slice(-HISTORY_LIMIT),
        future: future.slice(0, -1),
        selectedIds: selectedIds.filter((id) => existing.has(id)),
      });
    },
  };
};

export const useEditorStore = create<EditorState>()(editorStateCreator);
