"use client";

import { useLocaleStore, useT } from "@/i18n";
import { useUiStore } from "@/store/uiStore";

/** Header indicator: "Saving…", "Saved ✓" or "Not saved". */
export function SaveIndicator() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const status = useUiStore((s) => s.saveStatus);
  const savedAt = useUiStore((s) => s.lastSavedAt);

  let text: string | null = null;
  let title: string | undefined;
  let className = "text-zinc-500";
  if (status === "pending" || status === "saving") {
    text = t("save.saving");
  } else if (status === "error") {
    text = t("save.failed");
    title = t("save.failedHelp");
    className = "font-medium text-red-700";
  } else if (savedAt !== null) {
    text = t("save.saved");
    const time = new Date(savedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    title = t("save.savedHelp", { time });
  }

  return (
    // Always rendered (even empty) so screen readers announce the changes.
    <span role="status" title={title} className={`min-w-28 text-xs ${className}`}>
      {text}
    </span>
  );
}
