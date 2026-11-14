"use client";

import { useEffect } from "react";
import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

const buttonClass =
  "h-8 rounded-md px-2.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent";

/** Undo / Redo buttons + Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z shortcuts. */
export function HistoryControls() {
  const t = useT();
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const { undo, redo } = useEditorStore.getState();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTyping(e.target)) return;
      // Ignore shortcuts while a modal dialog is open.
      if (document.querySelector("[role=dialog]")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={buttonClass}
        onClick={undo}
        disabled={!canUndo}
        title={`${t("history.undo")} (Ctrl + Z)`}
      >
        ↶ {t("history.undo")}
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={redo}
        disabled={!canRedo}
        title={`${t("history.redo")} (Ctrl + Y)`}
      >
        ↷ {t("history.redo")}
      </button>
    </div>
  );
}
