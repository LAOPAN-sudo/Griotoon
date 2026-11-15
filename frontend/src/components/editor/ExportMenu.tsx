"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import type { ExportFormat } from "@/lib/exportPage";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { pageName } from "./pages/shared";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Header button: export the page as PNG or PDF. */
export function ExportMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const storyCount = useEditorStore((s) => s.pages.length - 1);
  const currentPage = useEditorStore((s) => s.currentPage);

  // Close on a click outside or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = async (format: ExportFormat) => {
    setOpen(false);
    setBusy(true);
    const ui = useUiStore.getState();
    ui.notify("info", "export.working");
    try {
      // Save a text being typed (blur) and a crop in progress, so the file
      // matches what is on screen.
      (document.activeElement as HTMLElement | null)?.blur();
      const editor = useEditorStore.getState();
      editor.stopEditing();
      editor.endCrop();
      await nextFrame();
      // Loaded on demand: the export code and jsPDF stay out of the first load.
      const { exportChapterPdf, exportPagePng } = await import("./exportCanvas");
      const { page, pages, currentPage: index, chapterNumber, chapterTitle } = useEditorStore.getState();
      // "chapitre-1-la-route-de-ouaga"; PNG files also name the page ("…-page-3", "…-couverture").
      const chapterName = [t("chapter.label"), chapterNumber, chapterTitle].filter((x) => x !== "").join(" ");
      if (format === "png") {
        await exportPagePng(page, `${chapterName} ${pageName(t, index)}`);
      } else {
        await exportChapterPdf(pages, chapterName, (n) => {
          if (pages.length > 1) useUiStore.getState().notify("info", "export.workingPage", { n, total: pages.length });
        });
      }
      useUiStore.getState().dismissNotice();
    } catch (error) {
      console.error(error);
      useUiStore.getState().notify("error", "export.error");
    } finally {
      setBusy(false);
    }
  };

  const items: { format: ExportFormat; label: string; help: string }[] = [
    { format: "png", label: t("export.png"), help: t("export.pngHelp", { name: pageName(t, currentPage) }) },
    { format: "pdf", label: t("export.pdf"), help: t("export.pdfHelp", { count: storyCount }) },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? t("export.working") : t("export.button")}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t("export.menu")}
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.format}
              type="button"
              role="menuitem"
              onClick={() => void run(item.format)}
              className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none"
            >
              <span className="text-sm font-medium text-zinc-900">{item.label}</span>
              <span className="text-xs text-zinc-500">{item.help}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
