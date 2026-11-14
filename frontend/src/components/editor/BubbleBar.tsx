"use client";

import { useShallow } from "zustand/react/shallow";
import { useT, type MessageKey } from "@/i18n";
import { BUBBLE_TYPES } from "@/lib/bubbles";
import { useEditorStore } from "@/store/editorStore";
import type { BubbleType } from "@/types/page";

const TYPE_LABELS: Record<BubbleType, MessageKey> = {
  speech: "bubble.speech",
  thought: "bubble.thought",
  shout: "bubble.shout",
  narration: "bubble.narration",
};

/** Small drawings of each bubble type, for the buttons. */
const TYPE_ICONS: Record<BubbleType, React.ReactNode> = {
  speech: <path d="M12 4c5 0 9 2.7 9 6s-4 6-9 6c-.8 0-1.6-.1-2.3-.2L5 19l1.2-4.1C4.2 13.8 3 12 3 10c0-3.3 4-6 9-6z" />,
  thought: (
    <>
      <path d="M7 13.5a3 3 0 0 1-.5-5.9 3.5 3.5 0 0 1 6-2 3.5 3.5 0 0 1 5.5 2.4 3 3 0 0 1-1 5.8 3.5 3.5 0 0 1-5 .7 3.5 3.5 0 0 1-5-1z" />
      <circle cx="6" cy="17" r="1.3" />
      <circle cx="4" cy="20" r="0.8" />
    </>
  ),
  shout: <path d="M12 3l1.8 3.5L17.5 4l-.6 4 4.1 1-3.3 2.5L20.5 15l-4-.3-.7 4L12 16.5 9 20l-.6-4.2-4.4.7 2.5-3.3L3 10.5l4-1.3L6 5l3.7 1.8z" />,
  narration: <rect x="3" y="7" width="18" height="10" rx="0.5" />,
};

/**
 * Floating bar for bubbles: shown with the Bubble tool (type of the next
 * bubble) or when bubbles are selected (changes their type).
 */
export function BubbleBar() {
  const t = useT();
  const tool = useEditorStore((s) => s.tool);
  const newType = useEditorStore((s) => s.newBubbleType);
  const editing = useEditorStore((s) => s.editingId !== null);
  // useShallow: the filter builds a new array each time; compare its content,
  // not its identity, or React would re-render forever.
  const selected = useEditorStore(
    useShallow((s) => s.page.bubbles.filter((b) => s.selectedIds.includes(b.id))),
  );
  const selectionSize = useEditorStore((s) => s.selectedIds.length);
  // Only when the selection is made of bubbles only.
  const selectedBubbles = selected.length > 0 && selected.length === selectionSize ? selected : null;

  const placing = tool === "bubble";
  if (editing || (!placing && !selectedBubbles)) return null;

  const ids = placing ? [] : selectedBubbles!.map((b) => b.id);
  const activeType: BubbleType | null = placing
    ? newType
    : selectedBubbles!.every((b) => b.type === selectedBubbles![0].type)
      ? selectedBubbles![0].type
      : null;

  return (
    <div
      role="toolbar"
      aria-label={t("bubble.barTitle")}
      className="absolute left-1/2 top-3 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-lg"
    >
      {BUBBLE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          aria-pressed={activeType === type}
          onClick={() => useEditorStore.getState().setBubbleType(ids, type)}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
            activeType === type ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
            {TYPE_ICONS[type]}
          </svg>
          {t(TYPE_LABELS[type])}
        </button>
      ))}
      <span className="hidden pl-1 text-xs text-zinc-500 xl:inline">
        {placing ? t("bubble.hintPlace") : t("bubble.hintEdit")}
      </span>
    </div>
  );
}
