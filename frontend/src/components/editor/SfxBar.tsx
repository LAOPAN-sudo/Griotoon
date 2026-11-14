"use client";

import { useShallow } from "zustand/react/shallow";
import { useT } from "@/i18n";
import { SFX_COLORS, SFX_STROKES } from "@/lib/sfx";
import { useEditorStore } from "@/store/editorStore";
import type { Sfx } from "@/types/page";

const swatchClass = (active: boolean) =>
  `h-6 w-6 rounded-full border shadow-sm ${active ? "ring-2 ring-zinc-900 ring-offset-2" : "border-zinc-300"}`;

/**
 * Floating bar for sound effects: hint while placing one (Sfx tool), colours
 * of the text and of the outline when sound effects are selected.
 */
export function SfxBar() {
  const t = useT();
  const tool = useEditorStore((s) => s.tool);
  const editing = useEditorStore((s) => s.editingId !== null);
  const selected = useEditorStore(useShallow((s) => s.page.sfx.filter((x) => s.selectedIds.includes(x.id))));
  const selectionSize = useEditorStore((s) => s.selectedIds.length);
  const selectedSfx = selected.length > 0 && selected.length === selectionSize ? selected : null;

  const placing = tool === "sfx";
  if (editing || (!placing && !selectedSfx)) return null;

  /** Same value for every selected sound effect, or null. */
  const common = (key: "color" | "strokeColor") =>
    selectedSfx && selectedSfx.every((x) => x[key] === selectedSfx[0][key]) ? selectedSfx[0][key] : null;

  const apply = (patch: Partial<Pick<Sfx, "color" | "strokeColor">>, mergeKey?: string) => {
    if (!selectedSfx) return;
    useEditorStore.getState().updateElements(
      selectedSfx.map((x) => ({ id: x.id, patch })),
      mergeKey,
    );
  };

  return (
    <div
      role="toolbar"
      aria-label={t("sfx.barTitle")}
      className="absolute left-1/2 top-3 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-lg"
    >
      <span className="font-semibold text-zinc-900">{t("sfx.barTitle")}</span>
      {placing ? (
        <span className="text-xs text-zinc-500">{t("sfx.hintPlace")}</span>
      ) : (
        <>
          <div role="group" aria-label={t("sfx.color")} className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-zinc-500">{t("sfx.color")}</span>
            {SFX_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={t(c.key)}
                title={t(c.key)}
                aria-pressed={common("color") === c.value}
                onClick={() => apply({ color: c.value })}
                className={swatchClass(common("color") === c.value)}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <label className="relative h-6 w-6 cursor-pointer" title={t("sfx.colorCustom")}>
              <span className="sr-only">{t("sfx.colorCustom")}</span>
              <input
                type="color"
                value={common("color") ?? "#000000"}
                // The picker sends many changes while dragging: one undo step.
                onChange={(e) => apply({ color: e.target.value }, "sfx-color")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className="block h-6 w-6 rounded-full border border-zinc-300"
                style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
              />
            </label>
          </div>
          <div role="group" aria-label={t("sfx.stroke")} className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-zinc-500">{t("sfx.stroke")}</span>
            {SFX_STROKES.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={t(c.key)}
                title={t(c.key)}
                aria-pressed={common("strokeColor") === c.value}
                onClick={() => apply({ strokeColor: c.value })}
                className={swatchClass(common("strokeColor") === c.value)}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <span className="hidden text-xs text-zinc-500 xl:inline">{t("sfx.hintEdit")}</span>
        </>
      )}
    </div>
  );
}
