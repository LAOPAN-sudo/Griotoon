"use client";

// Small form controls for the properties panel. Values are committed to the
// store on Enter / blur (number and text fields) or immediately (swatches,
// segmented choices), so each change is one undo step.

import { useEffect, useId, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useT } from "@/i18n";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-zinc-200 px-4 py-3 last:border-b-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Called with the new value; `merge` is true for arrow-key steps (one undo step for a series). */
  onCommit: (value: number, merge: boolean) => void;
}

/**
 * Number input that accepts "12,5" as well as "12.5". Arrow keys change the
 * value by `step` (×10 with Shift).
 */
export function NumberField({ label, value, min = -Infinity, max = Infinity, step = 1, unit, onCommit }: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null); // null = not editing
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = draft ?? String(Math.round(value * 10) / 10);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(",", ".").trim());
    setDraft(null);
    if (draft.trim() !== "" && Number.isFinite(n) && clamp(n) !== value) onCommit(clamp(n), false);
  };

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-600">
      {/* The label holds only the text, so the field's accessible name is "Marge", not "Marge px". */}
      <label htmlFor={id}>{label}</label>
      <span className="flex items-center rounded-md border border-zinc-300 bg-white focus-within:border-zinc-900">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={shown}
          onFocus={() => setDraft(String(Math.round(value * 10) / 10))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(null);
              e.currentTarget.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const delta = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
              const next = clamp(Math.round((value + delta) * 10) / 10);
              setDraft(String(next));
              if (next !== value) onCommit(next, true);
            }
          }}
          className="w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none tabular-nums"
        />
        {unit && (
          <span className="pr-2 text-xs text-zinc-400" aria-hidden="true">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

interface Swatch {
  value: string;
  label: string;
}

interface ColorFieldProps {
  label: string;
  value: string | null;
  swatches: Swatch[];
  /** Label of the "other colour" button; omit to offer only the swatches. */
  customLabel?: string;
  /** `merge` is true while dragging in the colour picker, which fires many changes. */
  onPick: (color: string, merge: boolean) => void;
}

/**
 * Swatches plus an "other colour" picker. The picker is drawn inside the
 * panel (react-colorful) rather than with the browser's <input type="color">,
 * whose popup is placed by the OS and can open off-screen next to the sidebar.
 */
export function ColorField({ label, value, swatches, customLabel, onPick }: ColorFieldProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = value?.toUpperCase() ?? null;
  const isHex = /^#[0-9a-f]{6}$/i.test(value ?? "");
  const custom = isHex && !swatches.some((s) => s.value.toUpperCase() === current);

  // Close on a click outside the field or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className="flex flex-col gap-1.5 text-xs text-zinc-600"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {label}
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((s) => {
          const active = current === s.value.toUpperCase();
          return (
            <button
              key={s.value}
              type="button"
              aria-label={s.label}
              title={s.label}
              aria-pressed={active}
              onClick={() => onPick(s.value, false)}
              className={`h-6 w-6 rounded-full border shadow-sm ${
                active ? "ring-2 ring-zinc-900 ring-offset-2" : "border-zinc-300"
              }`}
              style={{ backgroundColor: s.value }}
            />
          );
        })}
        {customLabel && (
          <button
            type="button"
            aria-label={customLabel}
            title={customLabel}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`h-6 w-6 rounded-full border border-zinc-300 shadow-sm ${
              custom || open ? "ring-2 ring-zinc-900 ring-offset-2" : ""
            }`}
            style={{
              // Shows the custom colour once chosen, a rainbow otherwise.
              background: custom ? value! : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            }}
          />
        )}
      </div>
      {open && customLabel && (
        <div
          // Scroll the sidebar so the whole picker is visible when it opens.
          ref={(el) => el?.scrollIntoView?.({ block: "nearest" })}
          className="griotoon-picker mt-1 space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-2"
        >
          <HexColorPicker color={isHex ? value! : "#000000"} onChange={(c) => onPick(c.toUpperCase(), true)} />
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 focus-within:border-zinc-900">
              <span aria-hidden="true" className="text-zinc-400">#</span>
              <HexColorInput
                aria-label={t("color.hex")}
                color={isHex ? value! : "#000000"}
                onChange={(c) => onPick(c.toUpperCase(), false)}
                className="w-full min-w-0 bg-transparent py-1 text-sm uppercase text-zinc-900 outline-none tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-700"
            >
              {t("color.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T | null;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  /** Show only icons (labels become tooltips). */
  iconsOnly?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, iconsOnly }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 text-xs text-zinc-600">
      {label}
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            aria-label={iconsOnly ? o.label : undefined}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
              value === o.value
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {o.icon}
            {!iconsOnly && o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onCommit: (value: string) => void;
}

/** Text saved when the field loses focus or on Ctrl + Enter (Enter for one-line fields). */
export function TextField({ label, value, placeholder, multiline, onCommit }: TextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  const common = {
    id,
    value: draft ?? value,
    placeholder,
    onFocus: () => setDraft(value),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setDraft(null);
        e.currentTarget.blur();
      }
    },
    className:
      "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-900",
  };
  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-600">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={3} {...common} className={`${common.className} resize-y`} /> : <input type="text" {...common} />}
    </div>
  );
}
