"use client";

import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";

const buttonClass =
  "h-8 rounded-md px-2.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent";

/** Undo / Redo buttons. The keyboard shortcuts live in EditorShortcuts. */
export function HistoryControls() {
  const t = useT();
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const { undo, redo } = useEditorStore.getState();

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
