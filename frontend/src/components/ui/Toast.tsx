"use client";

import { useEffect } from "react";
import { useT } from "@/i18n";
import { useUiStore } from "@/store/uiStore";

const AUTO_HIDE_MS = 5000;

/** Shows the current notice at the bottom of the screen. */
export function Toast() {
  const t = useT();
  const notice = useUiStore((s) => s.notice);
  const dismiss = useUiStore((s) => s.dismissNotice);

  // Errors stay a few seconds; "info" notices (e.g. "Importing…") are
  // replaced or dismissed by the code that created them.
  useEffect(() => {
    if (!notice || notice.kind !== "error") return;
    const timer = setTimeout(() => dismiss(notice.id), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;

  const error = notice.kind === "error";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        role={error ? "alert" : "status"}
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-lg ${
          error ? "bg-red-600 text-white" : "bg-zinc-900 text-white"
        }`}
      >
        <span>{t(notice.messageKey, notice.params)}</span>
        {error && (
          <button
            type="button"
            onClick={() => dismiss(notice.id)}
            aria-label={t("common.close")}
            className="rounded px-1 text-white/80 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
