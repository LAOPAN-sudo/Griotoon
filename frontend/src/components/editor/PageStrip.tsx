"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Page } from "@/types/page";
import { TrashIcon } from "./icons";
import { usePageThumbnail } from "./usePageThumbnail";

/** Bar of page thumbnails under the canvas: go to a page, add, copy, delete, reorder. */
export function PageStrip() {
  const t = useT();
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  /** Insertion point while dragging: the index the page would go before (pages.length = at the end). */
  const [dropAt, setDropAt] = useState<number | null>(null);

  const finishDrop = () => {
    if (dragging !== null && dropAt !== null) {
      // Index in the list once the dragged page is taken out.
      useEditorStore.getState().movePage(dragging, dropAt > dragging ? dropAt - 1 : dropAt);
    }
    setDragging(null);
    setDropAt(null);
  };

  const canDelete = pages.length > 1;

  return (
    <nav aria-label={t("pages.label")} className="flex h-36 shrink-0 items-stretch gap-1 border-t border-zinc-200 bg-white">
      <ol
        className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-4 py-2"
        onDragOver={(e) => dragging !== null && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          finishDrop();
        }}
      >
        {pages.map((page, index) => (
          <PageItem
            key={page.id}
            page={page}
            index={index}
            current={index === currentPage}
            canDelete={canDelete}
            dragging={dragging === index}
            dropBefore={dropAt === index}
            dropAfter={dropAt === pages.length && index === pages.length - 1}
            onDragStart={() => setDragging(index)}
            onDragOverHalf={(after) => dragging !== null && setDropAt(after ? index + 1 : index)}
            onDragEnd={() => {
              setDragging(null);
              setDropAt(null);
            }}
            onDelete={() => setToDelete(index)}
          />
        ))}
        <li className="shrink-0">
          <button
            type="button"
            onClick={() => useEditorStore.getState().addPage()}
            className="flex h-[6.5rem] w-[4.6rem] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-800"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              +
            </span>
            {t("pages.add")}
          </button>
        </li>
      </ol>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("pages.deleteTitle", { n: (toDelete ?? 0) + 1 })}
        message={t("pages.deleteMessage")}
        confirmLabel={t("pages.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          if (toDelete !== null) useEditorStore.getState().removePage(toDelete);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </nav>
  );
}

interface PageItemProps {
  page: Page;
  index: number;
  current: boolean;
  canDelete: boolean;
  dragging: boolean;
  dropBefore: boolean;
  dropAfter: boolean;
  onDragStart: () => void;
  onDragOverHalf: (after: boolean) => void;
  onDragEnd: () => void;
  onDelete: () => void;
}

function PageItem({
  page,
  index,
  current,
  canDelete,
  dragging,
  dropBefore,
  dropAfter,
  onDragStart,
  onDragOverHalf,
  onDragEnd,
  onDelete,
}: PageItemProps) {
  const t = useT();
  const thumbnail = usePageThumbnail(page);
  const name = t("pages.page", { n: index + 1 });

  return (
    <li
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", page.id); // required by Firefox
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onDragOverHalf(e.clientX > rect.left + rect.width / 2);
      }}
      onDragEnd={onDragEnd}
      className={`group relative flex shrink-0 flex-col items-center gap-1 ${dragging ? "opacity-40" : ""}`}
    >
      {dropBefore && <span className="absolute -left-2 top-0 bottom-5 w-0.5 rounded bg-blue-500" />}
      {dropAfter && <span className="absolute -right-2 top-0 bottom-5 w-0.5 rounded bg-blue-500" />}
      <button
        type="button"
        aria-current={current ? "page" : undefined}
        aria-label={name}
        title={t("pages.itemHelp")}
        onClick={() => useEditorStore.getState().goToPage(index)}
        onKeyDown={(e) => {
          // Alt + arrows: move the page left / right in the chapter.
          if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
          e.preventDefault();
          useEditorStore.getState().movePage(index, index + (e.key === "ArrowLeft" ? -1 : 1));
        }}
        className={`block overflow-hidden rounded-sm bg-white shadow-sm ring-offset-2 ${
          current ? "ring-2 ring-zinc-900" : "ring-1 ring-zinc-300 hover:ring-zinc-500"
        }`}
        style={{ width: "4.6rem", aspectRatio: `${page.width} / ${page.height}` }}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- local dataURL, next/image brings nothing here
          <img src={thumbnail} alt="" draggable={false} className="h-full w-full object-contain" />
        )}
      </button>
      <span className={`text-xs ${current ? "font-semibold text-zinc-900" : "text-zinc-500"}`}>{index + 1}</span>

      {/* Page actions, shown on hover and when the page is the current one. */}
      <div
        className={`absolute right-0.5 top-0.5 flex flex-col gap-0.5 ${
          current ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <button
          type="button"
          aria-label={t("pages.duplicate", { name })}
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
            aria-label={t("pages.delete", { name })}
            title={t("pages.deleteShort")}
            onClick={onDelete}
            className="rounded bg-white/90 p-0.5 text-zinc-600 shadow-sm hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </li>
  );
}
