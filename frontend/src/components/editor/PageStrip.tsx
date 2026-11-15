"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ChapterHeading } from "./pages/ChapterHeading";
import { AddPageButton, PageThumb, usePageDelete, usePageDrag } from "./pages/shared";

const THUMB_WIDTH = "3rem";

/**
 * Bar under the canvas: chapter name, position ("7 / 21"), the cover then
 * the pages as small thumbnails, and the button opening the chapter overview.
 */
export function PageStrip() {
  const t = useT();
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const drag = usePageDrag();
  const del = usePageDelete();
  const listRef = useRef<HTMLOListElement>(null);
  const storyCount = pages.length - 1;
  const canDelete = storyCount > 1;

  // Keep the page being edited visible in the bar (after Page Down, a new page…).
  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-page-index="${currentPage}"]`);
    item?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [currentPage, pages.length]);

  return (
    <nav aria-label={t("pages.label")} className="flex shrink-0 flex-col border-t border-zinc-200 bg-white">
      <div className="flex h-9 items-center gap-3 px-4 pt-1">
        <ChapterHeading />
        <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-500" aria-live="polite">
          {currentPage === 0
            ? t("pages.positionCover", { total: storyCount })
            : t("pages.position", { n: currentPage, total: storyCount })}
        </span>
        <button
          type="button"
          onClick={() => useUiStore.getState().setOverviewOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t("pages.overview")}
        </button>
      </div>
      <ol
        ref={listRef}
        // The mouse wheel scrolls the bar sideways (most mice only have a vertical wheel).
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
        onDragOver={(e) => drag.dragging !== null && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          drag.drop();
        }}
        className="flex items-center gap-2.5 overflow-x-auto px-4 pb-3 pt-1.5 [scrollbar-width:thin]"
      >
        {pages.map((page, index) => (
          <PageWithDivider key={page.id} cover={index === 0}>
            <PageThumb
              page={page}
              index={index}
              current={index === currentPage}
              last={index === pages.length - 1}
              canDelete={canDelete}
              width={THUMB_WIDTH}
              drag={drag}
              caption="badge"
              onOpen={() => useEditorStore.getState().goToPage(index)}
              onDelete={() => del.ask(index)}
            />
          </PageWithDivider>
        ))}
        <AddPageButton width={THUMB_WIDTH} label={t("pages.add")} />
      </ol>
      {del.dialog}
    </nav>
  );
}

/** The cover is followed by a thin separator: it is not part of the numbered pages. */
function PageWithDivider({ cover, children }: { cover: boolean; children: React.ReactNode }) {
  if (!cover) return children;
  return (
    <>
      {children}
      <li aria-hidden="true" className="mx-1 h-12 w-px shrink-0 list-none bg-zinc-200" />
    </>
  );
}
