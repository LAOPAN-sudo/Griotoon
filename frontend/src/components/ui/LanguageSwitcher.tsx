"use client";

import { LOCALES, useLocaleStore, useT } from "@/i18n";

export function LanguageSwitcher() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div role="group" aria-label={t("language.label")} className="inline-flex rounded-md border border-zinc-300 text-sm">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            title={t(`language.${code}`)}
            onClick={() => setLocale(code)}
            className={`px-3 py-1 font-medium first:rounded-l-md last:rounded-r-md ${
              active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
