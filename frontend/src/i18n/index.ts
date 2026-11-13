import { create } from "zustand";
import { en } from "./en";
import { fr, type MessageKey, type Messages } from "./fr";

export type Locale = "fr" | "en";
export type { MessageKey };

export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_STORAGE_KEY = "griotoon.locale";

export const dictionaries: Record<Locale, Messages> = { fr, en };

type Params = Record<string, string | number>;

/** Pure translation function, usable outside React (and in tests). */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const template = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null; // storage unavailable (private mode, blocked cookies…)
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  // Always start with the default locale so server and client render the
  // same HTML. The saved choice is applied after mount (see components/LocaleSync.tsx).
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore: the choice just won't be remembered
    }
    set({ locale });
  },
}));

/** Returns `t(key, params)` bound to the current locale. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key: MessageKey, params?: Params) => translate(locale, key, params);
}
