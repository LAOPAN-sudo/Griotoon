import { create, type StateCreator } from "zustand";
import { produce, type Draft } from "immer";
import type { Bubble, Page, Panel, Sfx } from "@/types/page";
import { allElements, createBubble, createEmptyPage, createPanel, createSfx } from "@/lib/page";

export const HISTORY_LIMIT = 100;

type Patch<T> = Partial<Omit<T, "id">>;

export interface EditorState {
  page: Page;
  selectedIds: string[];
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
  /** Remove panels, bubbles or sfx by id. */
  removeElement: (ids: string | string[]) => void;
  /** Replace all panels with the ones produced by a layout template. */
  applyTemplate: (panels: Panel[]) => void;
  /** Set z order from a list of ids, bottom first. Unlisted elements keep their z. */
  reorder: (orderedIds: string[]) => void;

  /** Select ids. With `additive`, toggle them in the current selection (Shift+click). */
  select: (ids: string | string[] | null, additive?: boolean) => void;

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
  const commit = (recipe: (draft: Draft<Page>) => void) => {
    const { page, past } = get();
    const next = produce(page, recipe);
    if (next === page) return; // nothing changed: no history entry
    set({
      page: next,
      past: [...past, page].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  return {
    page: createEmptyPage(),
    selectedIds: [],
    past: [],
    future: [],

    loadPage: (page) => set({ page, selectedIds: [], past: [], future: [] }),

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

    removeElement: (ids) => {
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
      set({ selectedIds: get().selectedIds.filter((id) => !toRemove.has(id)) });
    },

    applyTemplate: (panels) => {
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

    undo: () => {
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
