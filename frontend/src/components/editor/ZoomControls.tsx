"use client";

import { useT } from "@/i18n";
import { MAX_SCALE, MIN_SCALE } from "@/lib/viewport";
import { useEditorStore } from "@/store/editorStore";
import { useViewStore } from "@/store/viewStore";

const buttonClass =
  "h-8 min-w-8 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent";

export function ZoomControls() {
  const t = useT();
  const scale = useViewStore((s) => s.view.scale);
  const { zoomIn, zoomOut, fit } = useViewStore.getState();

  const fitPage = () => {
    const { width, height } = useEditorStore.getState().page;
    fit({ width, height });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={buttonClass}
        onClick={zoomOut}
        disabled={scale <= MIN_SCALE}
        aria-label={t("editor.zoomOut")}
        title={t("editor.zoomOut")}
      >
        −
      </button>
      <span
        className="w-14 text-center text-sm tabular-nums text-zinc-700"
        aria-label={t("editor.zoomLevel")}
      >
        {Math.round(scale * 100)} %
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={zoomIn}
        disabled={scale >= MAX_SCALE}
        aria-label={t("editor.zoomIn")}
        title={t("editor.zoomIn")}
      >
        +
      </button>
      <button type="button" className={buttonClass} onClick={fitPage}>
        {t("editor.fit")}
      </button>
    </div>
  );
}
