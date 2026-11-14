"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { BUBBLE_LINE_HEIGHT, canvasFontFamily, textBox } from "@/lib/bubbles";
import { SFX_FONT, SFX_LINE_HEIGHT, sfxStrokeWidth } from "@/lib/sfx";
import { useEditorStore } from "@/store/editorStore";
import { useViewStore } from "@/store/viewStore";
import type { Bubble, Sfx } from "@/types/page";

/**
 * HTML text field laid over a bubble or a sound effect while its text is
 * edited (Konva can't edit text). It uses the element's font, size and
 * rotation, scaled with the zoom, so what you type looks like the result.
 * Saved when it loses focus, on Escape or on (Ctrl +) Enter.
 */
export function TextEditor() {
  const bubble = useEditorStore((s) =>
    s.editingId ? s.page.bubbles.find((b) => b.id === s.editingId) : undefined,
  );
  const sfx = useEditorStore((s) =>
    s.editingId ? s.page.sfx.find((x) => x.id === s.editingId) : undefined,
  );
  // A new field for each element, so its draft text starts from that element.
  if (bubble) return <BubbleField key={bubble.id} bubble={bubble} />;
  if (sfx) return <SfxField key={sfx.id} sfx={sfx} />;
  return null;
}

/**
 * Focus the field once the click that opened it is over: when it opens from
 * a click on the canvas (Bubble or Sfx tool), the browser moves the focus to
 * the page at the end of that click, which would close the field right away.
 */
function useDeferredFocus(ref: React.RefObject<HTMLTextAreaElement | null>, selectAll: boolean) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      if (selectAll) el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
    return () => clearTimeout(timer);
  }, [ref, selectAll]);
}

function BubbleField({ bubble }: { bubble: Bubble }) {
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

  // Caret at the end of the text.
  useDeferredFocus(ref, false);

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
    // Outer box: the bubble's corner, rotated like the bubble.
    <div
      className="absolute z-10"
      style={{
        left: view.x + bubble.x * s,
        top: view.y + bubble.y * s,
        transform: `rotate(${bubble.rotation}deg)`,
        transformOrigin: "0 0",
      }}
    >
      {/* Inner box: the text area of the bubble, in its own axes. */}
      <div
        className="absolute flex items-center rounded-sm outline-2 outline-offset-4 outline-blue-500/60 outline-dashed"
        style={{
          left: box.x * s,
          top: box.y * s,
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
              save(); // directly: blur() does nothing if the field never got the focus
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
    </div>
  );
}

function SfxField({ sfx }: { sfx: Sfx }) {
  const t = useT();
  const view = useViewStore((s) => s.view);
  const [value, setValue] = useState(sfx.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const saved = useRef(false);

  const save = () => {
    if (saved.current) return;
    saved.current = true;
    const { updateSfx, removeElement, stopEditing } = useEditorStore.getState();
    stopEditing();
    // A sound effect without text is invisible: remove it.
    if (value.trim() === "") removeElement(sfx.id);
    else if (value !== sfx.text) updateSfx(sfx.id, { text: value });
  };

  // Whole text selected: typing replaces "BAM !" directly.
  useDeferredFocus(ref, true);

  const s = view.scale;
  const fontSize = sfx.fontSize * s;

  return (
    <textarea
      ref={ref}
      rows={Math.max(1, value.split("\n").length)}
      value={value}
      aria-label={t("sfx.textLabel")}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        // One line by default; Shift + Enter for a new line.
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          save(); // directly: blur() does nothing if the field never got the focus
        }
      }}
      className="absolute z-10 block resize-none overflow-hidden border-0 bg-transparent p-0 whitespace-pre outline-2 outline-offset-4 outline-blue-500/60 outline-dashed"
      style={{
        left: view.x + sfx.x * s,
        top: view.y + sfx.y * s,
        transform: `rotate(${sfx.rotation}deg)`,
        transformOrigin: "0 0",
        fontFamily: canvasFontFamily(SFX_FONT),
        fontSize,
        lineHeight: SFX_LINE_HEIGHT,
        color: sfx.color,
        WebkitTextStroke: `${sfxStrokeWidth(sfx.fontSize) * s}px ${sfx.strokeColor}`,
        paintOrder: "stroke fill",
        // Grow with the text (recent Chrome/Edge); other browsers keep the default width.
        fieldSizing: "content",
        minWidth: fontSize * 1.5,
      } as React.CSSProperties}
    />
  );
}
