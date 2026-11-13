"use client";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/i18n";

// Temporary home page. It will list projects once the editor exists.
export default function Home() {
  const t = useT();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <span className="font-bangers text-2xl tracking-wide text-zinc-900">
          {t("app.name")}
        </span>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-bangers text-5xl tracking-wide text-zinc-900">
          {t("app.tagline")}
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">{t("app.description")}</p>
        <p className="mt-6 rounded-full bg-amber-100 px-4 py-1 text-sm text-amber-900">
          {t("home.phase", { phase: 1 })} · {t("home.status")}
        </p>
      </main>
    </div>
  );
}
