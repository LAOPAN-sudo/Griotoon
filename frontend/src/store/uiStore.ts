import { create } from "zustand";
import type { MessageKey } from "@/i18n/fr";

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
