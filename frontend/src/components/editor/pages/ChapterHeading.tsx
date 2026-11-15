"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import { useEditorStore } from "@/store/editorStore";

/** "Chapitre [1] · [title]": number and title edited in place, saved on Enter or when leaving the field. */
export function ChapterHeading({ size = "sm" }: { size?: "sm" | "lg" }) {
  const t = useT();
  const number = useEditorStore((s) => s.chapterNumber);
  const title = useEditorStore((s) => s.chapterTitle);
  const [numberDraft, setNumberDraft] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const update = useEditorStore((s) => s.updateChapterInfo);

  const commitNumber = () => {
    if (numberDraft === null) return;
    const n = Number(numberDraft.trim());
    if (numberDraft.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 9999) update({ number: n });
    setNumberDraft(null);
  };
  const commitTitle = () => {
    if (titleDraft !== null) update({ title: titleDraft });
    setTitleDraft(null);
  };
  const keys = (commit: () => void, cancel: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      cancel();
      e.currentTarget.blur();
    }
  };

  const text = size === "lg" ? "text-lg" : "text-sm";
  const field = "rounded bg-transparent px-1 outline-none hover:bg-zinc-100 focus:bg-white focus:ring-1 focus:ring-zinc-400";

  return (
    <div className={`flex min-w-0 items-center gap-1 ${text} font-semibold text-zinc-900`}>
      <span className="shrink-0">{t("chapter.label")}</span>
      <input
        aria-label={t("chapter.number")}
        inputMode="numeric"
        value={numberDraft ?? String(number)}
        onFocus={() => setNumberDraft(String(number))}
        onChange={(e) => setNumberDraft(e.target.value)}
        onBlur={commitNumber}
        onKeyDown={keys(commitNumber, () => setNumberDraft(null))}
        className={`${field} w-[3ch] shrink-0 text-center tabular-nums`}
        style={{ width: `${Math.max(2, String(numberDraft ?? number).length) + 1}ch` }}
      />
      <span aria-hidden="true" className="shrink-0 text-zinc-400">
        ·
      </span>
      <input
        aria-label={t("chapter.title")}
        placeholder={t("chapter.titlePlaceholder")}
        value={titleDraft ?? title}
        maxLength={120}
        onFocus={() => setTitleDraft(title)}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={keys(commitTitle, () => setTitleDraft(null))}
        className={`${field} min-w-0 flex-1 font-normal italic placeholder:text-zinc-400 [&:not(:placeholder-shown)]:font-semibold [&:not(:placeholder-shown)]:not-italic`}
      />
    </div>
  );
}
