"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/i18n";
import { spreads } from "@/lib/chapter";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ChapterHeading } from "./pages/ChapterHeading";
import { AddPageButton, PageThumb, pageName, usePageDelete, usePageDrag } from "./pages/shared";

const THUMB_WIDTH = "8.5rem";

/**
 * Full-screen view of the chapter, like a contact sheet: the cover, then
 * the pages two by two as in the printed book. Click a page to open it,
 * drag to reorder, copy or delete from the hover buttons.
 */
export function ChapterOverview() {
  const t = useT();
  const open = useUiStore((s) => s.overviewOpen);
  const setOpen = useUiStore((s) => s.setOverviewOpen);
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const drag = usePageDrag();
  const del = usePageDelete();
  const closeRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const deleting = del.open;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    gridRef.current
      ?.querySelector(`[data-page-index="${useEditorStore.getState().currentPage}"]`)
      ?.scrollIntoView?.({ block: "center" });
    const onKeyDown = (e: KeyboardEvent) => {
      // The delete confirmation handles its own Escape.
      if (e.key === "Escape" && !deleting) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, setOpen]);

  if (!open) return null;

  const storyCount = pages.length - 1;
  const openPage = (index: number) => {
    useEditorStore.getState().goToPage(index);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("overview.title")}
      className="fixed inset-0 z-40 flex flex-col bg-zinc-100"
    >
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-6">
        <div className="min-w-0 flex-1">
          <ChapterHeading size="lg" />
        </div>
        <span className="shrink-0 text-sm text-zinc-500">{t("overview.count", { count: storyCount })}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {t("overview.close")}
        </button>
      </header>

      <p className="px-6 pt-4 text-sm text-zinc-500">{t("overview.help")}</p>

      <div
        ref={gridRef}
        onDragOver={(e) => drag.dragging !== null && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          drag.drop();
        }}
        className="flex flex-1 flex-wrap content-start items-end gap-x-10 gap-y-8 overflow-y-auto px-6 pb-10 pt-4"
      >
        {spreads(storyCount).map((spread) => (
          <ol
            key={spread.join("-")}
            aria-label={spread.map((i) => pageName(t, i)).join(" – ")}
            // Two pages side by side, touching, as an open book.
            className="flex gap-1 rounded-md bg-white/60 p-2 shadow-sm ring-1 ring-zinc-200"
          >
            {spread.map((index) => (
              <PageThumb
                key={pages[index].id}
                page={pages[index]}
                index={index}
                current={index === currentPage}
                last={index === pages.length - 1}
                canDelete={storyCount > 1}
                width={THUMB_WIDTH}
                drag={drag}
                caption="below"
                onOpen={() => openPage(index)}
                onDelete={() => del.ask(index)}
              />
            ))}
          </ol>
        ))}
        <ol className="p-2">
          <AddPageButton width={THUMB_WIDTH} label={t("pages.addLong")} />
        </ol>
      </div>
      {del.dialog}
    </div>
  );
}
