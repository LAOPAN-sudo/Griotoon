"use client";

import { useEffect } from "react";
import { readStoredLocale, useLocaleStore } from "@/i18n";

/**
 * Mount once in the root layout: restores the saved locale and keeps
 * <html lang> in sync (useful for screen readers and spell-checking).
 */
export function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) useLocaleStore.setState({ locale: stored });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
