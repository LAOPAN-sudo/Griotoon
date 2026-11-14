"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { TemplatePicker } from "./TemplatePicker";

/** Left tool column. More tools (panel, bubble, sfx, image) come in later steps. */
export function Toolbar() {
  const t = useT();
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
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={templatesOpen}
        aria-haspopup="true"
        onClick={() => setTemplatesOpen((open) => !open)}
        className={`flex flex-col items-center gap-1 rounded-md py-2 text-xs ${
          templatesOpen ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
        }`}
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
          className="absolute left-full top-2 ml-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">{t("templates.title")}</h2>
          <p className="mb-3 text-xs text-zinc-500">{t("templates.help")}</p>
          <TemplatePicker onDone={() => setTemplatesOpen(false)} />
        </div>
      )}
    </nav>
  );
}
