import { create } from "zustand";

// Interface state shared between components (open panels, dialogs…).
// Not part of the page, not in the undo history.

interface UiState {
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
