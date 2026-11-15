"use client";

// Pieces shared by the page bar and the chapter overview: page names, the
// thumbnail with its actions, drag-and-drop reordering, delete confirmation.

import { useState } from "react";
import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Page } from "@/types/page";
import { TrashIcon } from "../icons";
import { usePageThumbnail } from "../usePageThumbnail";

type T = ReturnType<typeof useT>;

/** "Couverture" for index 0, "Page n" otherwise (indexes count the cover as 0). */
export function pageName(t: T, index: number): string {
  return index === 0 ? t("pages.cover") : t("pages.page", { n: index });
}

/**
 * Reordering by drag and drop. `dropAt` is the index the dragged page would
 * be inserted before; the cover (index 0) never moves and nothing goes before it.
 */
export function usePageDrag() {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  return {
    dragging,
    dropAt,
    start: (index: number) => setDragging(index),
    over: (index: number, after: boolean) => {
      if (dragging === null) return;
      setDropAt(Math.max(1, after ? index + 1 : index));
    },
    drop: () => {
      if (dragging !== null && dropAt !== null) {
        // Index in the list once the dragged page is taken out.
        useEditorStore.getState().movePage(dragging, dropAt > dragging ? dropAt - 1 : dropAt);
      }
      setDragging(null);
      setDropAt(null);
    },
    cancel: () => {
      setDragging(null);
      setDropAt(null);
    },
  };
}

export type PageDrag = ReturnType<typeof usePageDrag>;

/** Delete confirmation, shared by every place that offers to delete a page. */
export function usePageDelete() {
  const t = useT();
  const [index, setIndex] = useState<number | null>(null);
  const dialog = (
    <ConfirmDialog
      open={index !== null}
      title={t("pages.deleteTitle", { n: index ?? 1 })}
      message={t("pages.deleteMessage")}
      confirmLabel={t("pages.deleteConfirm")}
      cancelLabel={t("common.cancel")}
      onConfirm={() => {
        if (index !== null) useEditorStore.getState().removePage(index);
        setIndex(null);
      }}
      onCancel={() => setIndex(null)}
    />
  );
  return { ask: setIndex, open: index !== null, dialog };
}

interface PageThumbProps {
  page: Page;
  index: number;
  current: boolean;
  /** Last item of its row: shows the drop line after it. */
  last: boolean;
  canDelete: boolean;
  /** Width of the thumbnail (CSS length). */
  width: string;
  drag: PageDrag;
  onOpen: () => void;
  onDelete: () => void;
  /** Show the page number / "Cover" under the picture (overview) or as a small badge on it (bar). */
  caption: "below" | "badge";
}

export function PageThumb({ page, index, current, last, canDelete, width, drag, onOpen, onDelete, caption }: PageThumbProps) {
  const t = useT();
  const thumbnail = usePageThumbnail(page);
  const name = pageName(t, index);
  const cover = index === 0;
  const short = cover ? t("pages.coverShort") : String(index);

  return (
    <li
      data-page-index={index}
      draggable={!cover}
      onDragStart={(e) => {
        drag.start(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", page.id); // required by Firefox
      }}
      onDragOver={(e) => {
        if (drag.dragging === null) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        drag.over(index, e.clientX > rect.left + rect.width / 2);
      }}
      onDragEnd={drag.cancel}
      className={`group relative flex shrink-0 list-none flex-col items-center gap-1 ${drag.dragging === index ? "opacity-40" : ""}`}
    >
      {drag.dropAt === index && <span className="absolute -left-1.5 inset-y-0 w-0.5 rounded bg-blue-500" />}
      {last && drag.dropAt === index + 1 && drag.dragging !== null && (
        <span className="absolute -right-1.5 inset-y-0 w-0.5 rounded bg-blue-500" />
      )}
      <button
        type="button"
        aria-current={current ? "page" : undefined}
        aria-label={name}
        title={cover ? t("pages.coverHelp") : t("pages.itemHelp")}
        onClick={onOpen}
        onKeyDown={(e) => {
          // Alt + arrows: move the page left / right in the chapter.
          if (cover || !e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
          e.preventDefault();
          useEditorStore.getState().movePage(index, index + (e.key === "ArrowLeft" ? -1 : 1));
        }}
        className={`relative block overflow-hidden rounded-sm bg-white shadow-sm ring-offset-2 ${
          current ? "ring-2 ring-zinc-900" : "ring-1 ring-zinc-300 hover:ring-zinc-500"
        }`}
        style={{ width, aspectRatio: `${page.width} / ${page.height}` }}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- local dataURL, next/image brings nothing here
          <img src={thumbnail} alt="" draggable={false} className="h-full w-full object-contain" />
        )}
        {caption === "badge" && (
          <span
            aria-hidden="true"
            className={`absolute bottom-0.5 left-0.5 rounded px-1 text-[10px] font-semibold leading-4 ${
              current ? "bg-zinc-900 text-white" : cover ? "bg-amber-100 text-amber-900" : "bg-white/90 text-zinc-700"
            }`}
          >
            {short}
          </span>
        )}
      </button>
      {caption === "below" && (
        <span className={`text-xs ${current ? "font-semibold text-zinc-900" : cover ? "font-medium text-amber-800" : "text-zinc-500"}`}>
          {name}
        </span>
      )}

      {/* Page actions: on hover, always visible on the page being edited. Not for the cover. */}
      {!cover && (
        <div
          className={`absolute right-0.5 top-0.5 flex flex-col gap-0.5 ${
            current ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          <button
            type="button"
            aria-label={t("pages.duplicate", { n: index })}
            title={t("pages.duplicateShort")}
            onClick={() => useEditorStore.getState().duplicatePage(index)}
            className="rounded bg-white/90 p-0.5 text-zinc-600 shadow-sm hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="1" />
              <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
            </svg>
          </button>
          {canDelete && (
            <button
              type="button"
              aria-label={t("pages.delete", { n: index })}
              title={t("pages.deleteShort")}
              onClick={onDelete}
              className="rounded bg-white/90 p-0.5 text-zinc-600 shadow-sm hover:bg-red-50 hover:text-red-700"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** "+ Page" button. */
export function AddPageButton({ width, label }: { width: string; label: string }) {
  return (
    <li className="shrink-0 list-none">
      <button
        type="button"
        onClick={() => useEditorStore.getState().addPage()}
        className="flex flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-800"
        style={{ width, aspectRatio: "1240 / 1754" }}
      >
        <span aria-hidden="true" className="text-xl leading-none">
          +
        </span>
        {label}
      </button>
    </li>
  );
}
