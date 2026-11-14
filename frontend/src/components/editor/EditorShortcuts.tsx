"use client";

import { useEffect } from "react";
import { isTypingTarget, matchShortcut } from "@/lib/shortcuts";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";

/** Listens to the keyboard for the whole editor. Renders nothing. */
export function EditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // A modal dialog handles its own keys (Escape…).
      if (document.querySelector("[role=dialog]")) return;

      const action = matchShortcut(e);
      if (!action) return;

      const store = useEditorStore.getState();
      const { selectedIds } = store;

      switch (action.type) {
        case "undo":
          store.undo();
          break;
        case "redo":
          store.redo();
          break;
        case "delete":
          if (selectedIds.length === 0) return;
          store.removeElement(selectedIds);
          break;
        case "duplicate":
          // Always block the browser's "bookmark page" shortcut in the editor.
          e.preventDefault();
          if (selectedIds.length > 0) store.duplicate(selectedIds);
          return;
        case "nudge":
          if (selectedIds.length === 0) return; // let arrows scroll the page
          store.nudge(selectedIds, action.dx, action.dy);
          break;
        case "tool":
          store.setTool(action.tool);
          break;
        case "help":
          useUiStore.getState().setShortcutsOpen(true);
          break;
        case "escape":
          if (store.tool !== "select") store.setTool("select");
          else store.select(null);
          break;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
