import { create } from "zustand";
import type { MessageKey } from "@/i18n/fr";
import type { SaveStatus } from "@/lib/autosave";

// Interface state shared between components (open panels, dialogs, notices…).
// Not part of the page, not in the undo history.

export interface Notice {
  id: number;
  kind: "info" | "error";
  messageKey: MessageKey;
  params?: Record<string, string | number>;
}

interface UiState {
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  /** Right column (properties + layers). */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  /** Local save (IndexedDB): state shown in the header, time of the last successful save. */
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  setSaveStatus: (status: SaveStatus, savedAt?: number) => void;

  /** Short message shown at the bottom of the screen (errors, progress). */
  notice: Notice | null;
  notify: (kind: Notice["kind"], messageKey: MessageKey, params?: Notice["params"]) => number;
  /** Hide the notice (only if it is still the one with this id, when given). */
  dismissNotice: (id?: number) => void;
}

let nextNoticeId = 1;

export const useUiStore = create<UiState>()((set, get) => ({
  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  saveStatus: "idle",
  lastSavedAt: null,
  setSaveStatus: (saveStatus, savedAt) =>
    set((s) => ({ saveStatus, lastSavedAt: savedAt ?? s.lastSavedAt })),

  notice: null,
  notify: (kind, messageKey, params) => {
    const id = nextNoticeId++;
    set({ notice: { id, kind, messageKey, params } });
    return id;
  },
  dismissNotice: (id) => {
    if (id === undefined || get().notice?.id === id) set({ notice: null });
  },
}));
