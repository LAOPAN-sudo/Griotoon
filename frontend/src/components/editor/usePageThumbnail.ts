"use client";

import { useEffect, useState } from "react";
import type { Page } from "@/types/page";

/** Thumbnail width in pixels (drawn at twice the display size, sharp on high-density screens). */
export const THUMBNAIL_WIDTH = 160;
/** Wait for a pause in the edits before redrawing (the current page changes often). */
const DELAY_MS = 400;

// Pages are immutable: a page object that did not change keeps its thumbnail.
const cache = new WeakMap<Page, string>();

/**
 * Picture of a page for the page bar, drawn off screen with the same
 * components as the editor. Keeps showing the previous picture while the
 * new one is drawn, so thumbnails never flash.
 */
export function usePageThumbnail(page: Page): string | null {
  // Last picture drawn for this item; a cached picture of the current page object wins.
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (cache.has(page)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { renderPageCanvas } = await import("./renderPage");
        const canvas = await renderPageCanvas(page, THUMBNAIL_WIDTH / page.width);
        const next = canvas.toDataURL("image/png");
        cache.set(page, next);
        if (!cancelled) setUrl(next);
      } catch {
        // No canvas (tests) or a broken image: the thumbnail stays as it was.
      }
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page]);

  return cache.get(page) ?? url;
}
