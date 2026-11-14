"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n";
import { TEMPLATES, type Template } from "@/lib/templates";
import { useEditorStore } from "@/store/editorStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createEmptyPage } from "@/lib/page";
import type { Page } from "@/types/page";

/** Miniature of a template, drawn in SVG from the same function that builds the panels. */
function TemplateThumbnail({ template, page }: { template: Template; page: Page }) {
  const panels = useMemo(() => template.build(page), [template, page]);
  return (
    <svg
      viewBox={`0 0 ${page.width} ${page.height}`}
      className="h-20 w-auto rounded-sm bg-white shadow-sm ring-1 ring-zinc-200"
      aria-hidden="true"
    >
      {panels.map((p) => (
        <rect
          key={p.id}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          transform={p.rotation ? `rotate(${p.rotation} ${p.x} ${p.y})` : undefined}
          fill="#f4f4f5"
          stroke="#18181b"
          strokeWidth={14}
        />
      ))}
    </svg>
  );
}

interface TemplatePickerProps {
  onDone: () => void;
}

/** Grid of layout templates. Asks for confirmation before replacing existing panels. */
export function TemplatePicker({ onDone }: TemplatePickerProps) {
  const t = useT();
  const [pending, setPending] = useState<Template | null>(null);

  // Thumbnails only depend on the page size and spacing, not on its content,
  // so they are not recomputed on every edit.
  const width = useEditorStore((s) => s.page.width);
  const height = useEditorStore((s) => s.page.height);
  const margin = useEditorStore((s) => s.page.margin);
  const gutter = useEditorStore((s) => s.page.gutter);
  const thumbPage = useMemo(
    () => ({ ...createEmptyPage(), width, height, margin, gutter }),
    [width, height, margin, gutter],
  );

  const apply = (template: Template) => {
    const { page, applyTemplate } = useEditorStore.getState();
    applyTemplate(template.build(page));
    setPending(null);
    onDone();
  };

  const choose = (template: Template) => {
    if (useEditorStore.getState().page.panels.length > 0) setPending(template);
    else apply(template);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => choose(template)}
            className="flex flex-col items-center gap-1.5 rounded-md p-2 text-xs text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900"
          >
            <TemplateThumbnail template={template} page={thumbPage} />
            {t(template.nameKey)}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={t("templates.confirmTitle")}
        message={t("templates.confirmMessage")}
        confirmLabel={t("templates.confirmReplace")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => pending && apply(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
