"use client";

import { useT } from "@/i18n";
import { coverScale, MAX_ZOOM_FACTOR, zoomCrop } from "@/lib/image";
import { useEditorStore } from "@/store/editorStore";

/** Floating bar shown while cropping an image: zoom slider, remove, done. */
export function CropBar() {
  const t = useT();
  const crop = useEditorStore((s) => s.crop);
  const panel = useEditorStore((s) =>
    s.crop ? s.page.panels.find((p) => p.id === s.crop?.panelId) : undefined,
  );
  if (!crop || !panel) return null;

  const min = coverScale(panel.w, panel.h, crop.image);
  const max = min * MAX_ZOOM_FACTOR;
  // Slider in percent of the "cover" size, easier to read than a raw scale.
  const percent = Math.round((crop.image.scale / min) * 100);

  return (
    <div
      role="toolbar"
      aria-label={t("crop.title")}
      className="absolute left-1/2 top-3 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-lg"
    >
      <span className="font-semibold text-zinc-900">{t("crop.title")}</span>
      <span className="hidden text-xs text-zinc-500 xl:inline">{t("crop.help")}</span>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        {t("crop.zoom")}
        <input
          type="range"
          min={min}
          max={max}
          step={(max - min) / 200}
          value={crop.image.scale}
          onChange={(e) => {
            const { crop, updateCrop } = useEditorStore.getState();
            if (crop) updateCrop(zoomCrop(panel.w, panel.h, crop.image, Number(e.target.value)));
          }}
          className="w-28 accent-zinc-900"
        />
        <span className="w-10 tabular-nums">{percent} %</span>
      </label>
      <button
        type="button"
        onClick={() => useEditorStore.getState().setPanelImage(panel.id, null)}
        className="rounded-md px-2.5 py-1 text-red-700 hover:bg-red-50"
      >
        {t("crop.remove")}
      </button>
      <button
        type="button"
        onClick={() => useEditorStore.getState().endCrop()}
        title={`${t("crop.done")} (${t("keys.escape")})`}
        className="rounded-md bg-zinc-900 px-3 py-1 font-medium text-white hover:bg-zinc-700"
      >
        {t("crop.done")}
      </button>
    </div>
  );
}
