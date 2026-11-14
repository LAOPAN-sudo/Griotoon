"use client";

import { Fragment, useEffect, useRef } from "react";
import { dictionaries, useLocaleStore, useT, type MessageKey } from "@/i18n";
import { SHORTCUT_GROUPS, type KeyToken } from "@/lib/shortcuts";
import { useUiStore } from "@/store/uiStore";

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** Small keyboard key, e.g. [Ctrl] + [Z]. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-zinc-300 border-b-2 bg-zinc-50 px-1.5 py-0.5 font-sans text-xs text-zinc-800">
      {children}
    </kbd>
  );
}

/** "Keyboard shortcuts" dialog. Opens with "?", the header button or the canvas hint. */
export function ShortcutsDialog() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Remember what had the focus, to give it back when closing.
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, setOpen]);

  if (!open) return null;

  const mac = isMac();
  const label = (token: KeyToken): string => {
    if (token === "keys.ctrl" && mac) return "⌘";
    return token in dictionaries[locale] ? t(token as MessageKey) : token;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false); // click outside
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 id="shortcuts-title" className="text-base font-semibold text-zinc-900">
            {t("shortcuts.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-x-8 gap-y-5 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.titleKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t(group.titleKey)}
              </h3>
              <dl className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.descriptionKey} className="flex items-start justify-between gap-4 text-sm">
                    <dt className="text-zinc-700">{t(item.descriptionKey)}</dt>
                    <dd className="flex shrink-0 flex-wrap items-center justify-end gap-1 text-xs text-zinc-400">
                      {item.combos.map((combo, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span className="px-0.5">{t("shortcuts.or")}</span>}
                          {combo.map((token, j) => (
                            <Fragment key={j}>
                              {j > 0 && <span>+</span>}
                              <Kbd>{label(token)}</Kbd>
                            </Fragment>
                          ))}
                        </Fragment>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Header button opening the dialog. */
export function ShortcutsButton() {
  const t = useT();
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title={`${t("shortcuts.title")} (?)`}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-zinc-700 hover:bg-zinc-100"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" strokeLinecap="round" />
      </svg>
      {t("shortcuts.button")}
    </button>
  );
}
