"use client";

import { useEffect, useRef, useState } from "react";
import { useT, type MessageKey } from "@/i18n";
import { useEditorStore, type Tool } from "@/store/editorStore";
import { TemplatePicker } from "./TemplatePicker";
import { openImagePicker } from "./imageImport";

const toolButtonClass = (active: boolean) =>
  `flex flex-col items-center gap-1 rounded-md py-2 text-xs ${
    active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
  }`;

const TOOLS: { tool: Tool; labelKey: MessageKey; shortcut: string; icon: React.ReactNode }[] = [
  {
    tool: "select",
    labelKey: "toolbar.select",
    shortcut: "V",
    icon: <path d="M5 3l14 8-6 1.5L10 19z" strokeLinejoin="round" />,
  },
  {
    tool: "panel",
    labelKey: "toolbar.panel",
    shortcut: "C",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="1" />
        <path d="M12 9v6M9 12h6" />
      </>
    ),
  },
  {
    tool: "bubble",
    labelKey: "toolbar.bubble",
    shortcut: "B",
    icon: <path d="M12 4c5 0 9 2.7 9 6s-4 6-9 6c-.8 0-1.6-.1-2.3-.2L5 19l1.2-4.1C4.2 13.8 3 12 3 10c0-3.3 4-6 9-6z" strokeLinejoin="round" />,
  },
];

/** Left tool column. Bubble, sfx and image tools come in later steps. */
export function Toolbar() {
  const t = useT();
  const activeTool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  // The Image button needs exactly one selected panel to put the image in.
  const imageTarget = useEditorStore((s) => {
    if (s.selectedIds.length !== 1) return null;
    return s.page.panels.find((p) => p.id === s.selectedIds[0]) ?? null;
  });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the template popover on Escape or on a click outside of it.
  useEffect(() => {
    if (!templatesOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      // Don't close when the user is answering the confirmation dialog.
      if ((target as HTMLElement).closest?.("[role=dialog]")) return;
      setTemplatesOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) setTemplatesOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [templatesOpen]);

  return (
    <nav
      aria-label={t("toolbar.label")}
      className="relative z-10 flex w-20 shrink-0 flex-col items-stretch gap-1 border-r border-zinc-200 bg-white p-2"
    >
      {TOOLS.map(({ tool, labelKey, shortcut, icon }) => (
        <button
          key={tool}
          type="button"
          aria-pressed={activeTool === tool}
          title={`${t(labelKey)} (${shortcut})`}
          onClick={() => setTool(tool)}
          className={toolButtonClass(activeTool === tool)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            {icon}
          </svg>
          {t(labelKey)}
        </button>
      ))}

      <button
        type="button"
        disabled={!imageTarget}
        title={imageTarget ? t("toolbar.imageTitle") : t("toolbar.imageDisabled")}
        onClick={() => imageTarget && openImagePicker(imageTarget.id)}
        className={`${toolButtonClass(false)} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <circle cx="9" cy="10" r="2" />
          <path d="M21 17l-5-5-9 8" strokeLinejoin="round" />
        </svg>
        {t("toolbar.image")}
      </button>

      <hr className="my-1 border-zinc-200" />

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={templatesOpen}
        aria-haspopup="true"
        onClick={() => setTemplatesOpen((open) => !open)}
        className={toolButtonClass(templatesOpen)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <path d="M3 10h18M12 10v11" />
        </svg>
        {t("toolbar.templates")}
      </button>

      {templatesOpen && (
        <div
          ref={popoverRef}
          role="region"
          aria-label={t("templates.title")}
          className="absolute left-full top-64 ml-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">{t("templates.title")}</h2>
          <p className="mb-3 text-xs text-zinc-500">{t("templates.help")}</p>
          <TemplatePicker onDone={() => setTemplatesOpen(false)} />
        </div>
      )}
    </nav>
  );
}
