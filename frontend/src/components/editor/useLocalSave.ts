"use client";

import { useEffect, useState } from "react";
import { createAutosave } from "@/lib/autosave";
import { idbPageStorage, parseSavedPage, type PageStorage } from "@/lib/pageStorage";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

/**
 * Restores the last page saved in this browser, then saves every change
 * after a 1 s pause. Returns false until the restore is done: the canvas is
 * only shown afterwards, so an empty page can never overwrite a saved one.
 */
export function useLocalSave(storage: PageStorage = idbPageStorage): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const ui = useUiStore.getState();

    const start = async () => {
      let saved = null;
      try {
        saved = parseSavedPage(await storage.load());
      } catch {
        // IndexedDB unavailable (some private windows): edit anyway, saving will report the error.
      }
      // React may run this effect twice in development; only the last run applies.
      if (cancelled) return;
      if (saved) {
        useEditorStore.getState().loadPage(saved.page);
        ui.setSaveStatus("saved", saved.savedAt);
      }

      let errorShown = false;
      const autosave = createAutosave({
        storage,
        getPage: () => useEditorStore.getState().page,
        subscribe: (listener) => useEditorStore.subscribe((s, prev) => s.page !== prev.page && listener()),
        onStatus: (status, { savedAt, error }) => {
          useUiStore.getState().setSaveStatus(status, savedAt);
          if (status === "saved") errorShown = false;
          // One message per failure series, not one per edit.
          if (status === "error" && !errorShown) {
            errorShown = true;
            useUiStore.getState().notify("error", isQuotaError(error) ? "save.errorQuota" : "save.error");
          }
        },
      });

      // Save right away when the tab is hidden or closed (mobile browsers
      // may kill a background tab without warning).
      const onHide = () => {
        if (document.visibilityState === "hidden") void autosave.flush();
      };
      const onPageHide = () => void autosave.flush();
      // Leaving: write pending changes right away (fast enough in practice).
      // Ask for confirmation only when saving is failing, as the changes would be lost.
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!autosave.hasUnsavedChanges()) return;
        void autosave.flush();
        if (useUiStore.getState().saveStatus === "error") e.preventDefault();
      };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("beforeunload", onBeforeUnload);

      cleanup = () => {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("beforeunload", onBeforeUnload);
        void autosave.flush().finally(autosave.dispose);
      };
      setReady(true);
    };
    void start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [storage]);

  return ready;
}
