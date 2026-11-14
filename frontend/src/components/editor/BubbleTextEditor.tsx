"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { BUBBLE_LINE_HEIGHT, canvasFontFamily, textBox } from "@/lib/bubbles";
import { useEditorStore } from "@/store/editorStore";
import { useViewStore } from "@/store/viewStore";
import type { Bubble } from "@/types/page";

/**
 * HTML text field laid over a bubble while its text is edited (Konva can't
 * edit text). It uses the bubble's font and size, scaled with the zoom, so
 * what you type looks like the final result. Saved when it loses focus,
 * on Escape or on Ctrl + Enter.
 */
export function BubbleTextEditor() {
  const bubble = useEditorStore((s) =>
    s.editingId ? s.page.bubbles.find((b) => b.id === s.editingId) : undefined,
  );
  // A new field for each bubble, so its draft text starts from that bubble.
  return bubble ? <Field key={bubble.id} bubble={bubble} /> : null;
}

function Field({ bubble }: { bubble: Bubble }) {
  const t = useT();
  const view = useViewStore((s) => s.view);
  const [value, setValue] = useState(bubble.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const saved = useRef(false);

  const save = () => {
    if (saved.current) return;
    saved.current = true;
    const { updateBubble, stopEditing } = useEditorStore.getState();
    if (value !== bubble.text) updateBubble(bubble.id, { text: value });
    stopEditing();
  };

  // Focus with the caret at the end of the text. Deferred: when the field
  // opens from a click on the canvas (Bubble tool), the browser moves the
  // focus to the page at the end of that click, which would close the field
  // right away.
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Grow with the text (the wrapper keeps it vertically centred).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, view.scale]);

  const box = textBox(bubble.type, bubble.w, bubble.h);
  const s = view.scale;

  return (
    <div
      className="absolute z-10 flex items-center rounded-sm outline-2 outline-offset-4 outline-blue-500/60 outline-dashed"
      style={{
        left: view.x + (bubble.x + box.x) * s,
        top: view.y + (bubble.y + box.y) * s,
        width: box.w * s,
        height: box.h * s,
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label={t("bubble.textLabel")}
        spellCheck
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[#111111] outline-none"
        style={{
          fontFamily: canvasFontFamily(bubble.fontFamily),
          fontSize: bubble.fontSize * s,
          lineHeight: BUBBLE_LINE_HEIGHT,
          textAlign: bubble.align,
        }}
      />
    </div>
  );
}
