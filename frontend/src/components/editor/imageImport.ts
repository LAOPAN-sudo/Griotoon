"use client";

import { compressImage, coverCrop, ImageImportFailure, MAX_FILE_BYTES } from "@/lib/image";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import type { MessageKey } from "@/i18n";

const ERROR_KEYS: Record<ImageImportFailure["reason"], MessageKey> = {
  notImage: "image.errorNotImage",
  tooLarge: "image.errorTooLarge",
  decode: "image.errorDecode",
};

/** Compress a file and put it in a panel, covering it. Shows progress and errors. */
export async function importImageIntoPanel(file: File, panelId: string): Promise<boolean> {
  const ui = useUiStore.getState();
  const progressId = ui.notify("info", "image.importing");
  try {
    const { src, width, height } = await compressImage(file);
    const store = useEditorStore.getState();
    const panel = store.page.panels.find((p) => p.id === panelId);
    if (!panel) {
      // The panel was deleted while we were compressing.
      useUiStore.getState().dismissNotice(progressId);
      return false;
    }
    store.setPanelImage(panelId, { src, width, height, ...coverCrop(panel.w, panel.h, { width, height }) });
    useUiStore.getState().dismissNotice(progressId);
    return true;
  } catch (error) {
    const reason = error instanceof ImageImportFailure ? error.reason : "decode";
    useUiStore
      .getState()
      .notify("error", ERROR_KEYS[reason], { max: Math.round(MAX_FILE_BYTES / 1024 / 1024) });
    return false;
  }
}

// The hidden <input type="file"> lives in ImagePicker. Other components open
// it through this function (it must run inside a click handler for the
// browser to allow the file dialog).
let opener: ((panelId: string) => void) | null = null;

export function registerImagePicker(fn: ((panelId: string) => void) | null) {
  opener = fn;
}

export function openImagePicker(panelId: string) {
  opener?.(panelId);
}
