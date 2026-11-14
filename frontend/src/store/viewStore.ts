import { create, type StateCreator } from "zustand";
import {
  fitView,
  zoomAt,
  ZOOM_STEP,
  type Point,
  type Size,
  type View,
} from "@/lib/viewport";

// View state (zoom and pan) of the editor. This is screen state, not page
// content: it is NOT part of the undo history and is not saved with the page.

export interface ViewState {
  view: View;
  viewport: Size;
  /** True until the user zooms or pans: the page then refits on resize. */
  autoFit: boolean;

  /** Called when the canvas area is measured or resized. */
  setViewport: (viewport: Size, page: Size) => void;
  /** Show the whole page, centred. */
  fit: (page: Size) => void;
  /** Zoom to `scale`, keeping the point under `anchor` fixed (defaults to the viewport centre). */
  zoomTo: (scale: number, anchor?: Point) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
  setPosition: (x: number, y: number) => void;
}

export const viewStateCreator: StateCreator<ViewState> = (set, get) => {
  const centre = (): Point => {
    const { viewport } = get();
    return { x: viewport.width / 2, y: viewport.height / 2 };
  };

  return {
    view: { scale: 1, x: 0, y: 0 },
    viewport: { width: 0, height: 0 },
    autoFit: true,

    setViewport: (viewport, page) => {
      set({ viewport });
      if (get().autoFit) set({ view: fitView(viewport, page) });
    },

    fit: (page) => set({ view: fitView(get().viewport, page), autoFit: true }),

    zoomTo: (scale, anchor) =>
      set({ view: zoomAt(get().view, anchor ?? centre(), scale), autoFit: false }),

    zoomIn: () => get().zoomTo(get().view.scale * ZOOM_STEP),
    zoomOut: () => get().zoomTo(get().view.scale / ZOOM_STEP),

    panBy: (dx, dy) => {
      const { view } = get();
      set({ view: { ...view, x: view.x + dx, y: view.y + dy }, autoFit: false });
    },

    setPosition: (x, y) => set({ view: { ...get().view, x, y }, autoFit: false }),
  };
};

export const useViewStore = create<ViewState>()(viewStateCreator);
