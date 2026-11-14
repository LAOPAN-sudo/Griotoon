// Keyboard shortcuts of the editor (docs/06-spec-editeur.md), as a pure
// mapping from a key event to an action, so it can be tested without a DOM.

import type { Tool } from "@/store/editorStore";
import type { MessageKey } from "@/i18n/fr";

export type ShortcutAction =
  | { type: "undo" }
  | { type: "redo" }
  | { type: "delete" }
  | { type: "duplicate" }
  | { type: "nudge"; dx: number; dy: number }
  | { type: "tool"; tool: Tool }
  | { type: "escape" }
  | { type: "help" };

type KeyInfo = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function matchShortcut(e: KeyInfo): ShortcutAction | null {
  if (e.altKey) return null;
  const mod = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on macOS
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  if (mod) {
    if (key === "z") return e.shiftKey ? { type: "redo" } : { type: "undo" };
    if (key === "y") return { type: "redo" };
    if (key === "d") return { type: "duplicate" };
    return null;
  }

  // "?" is Shift + a layout-dependent key, so match on the character itself.
  if (key === "?") return { type: "help" };
  if (key === "Delete" || key === "Backspace") return { type: "delete" };
  if (key === "Escape") return { type: "escape" };

  const arrow = ARROWS[key];
  if (arrow) {
    const step = e.shiftKey ? 10 : 1;
    return { type: "nudge", dx: arrow[0] * step, dy: arrow[1] * step };
  }

  if (!e.shiftKey) {
    if (key === "v") return { type: "tool", tool: "select" };
    if (key === "c") return { type: "tool", tool: "panel" };
    if (key === "b") return { type: "tool", tool: "bubble" };
    if (key === "o") return { type: "tool", tool: "sfx" };
  }
  return null;
}

/** True when the key press is meant for a text field, not for the editor. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// ------------------------------------------------------------------ help list
// Shown in the "Keyboard shortcuts" dialog. Keep in sync with matchShortcut
// above (and with the canvas mouse gestures) when adding a shortcut.

/**
 * A key of a combination: either a translation key ("keys.shift" → "Maj" /
 * "Shift") or a literal shown as is ("Z", "?").
 */
export type KeyToken = MessageKey | (string & {});

export interface ShortcutHelp {
  /** Alternative combinations, e.g. Ctrl+Y or Ctrl+Shift+Z. Each one is a list of keys. */
  combos: KeyToken[][];
  descriptionKey: MessageKey;
}

export interface ShortcutGroup {
  titleKey: MessageKey;
  items: ShortcutHelp[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: "shortcuts.groupGeneral",
    items: [
      { combos: [["keys.ctrl", "Z"]], descriptionKey: "shortcuts.undo" },
      { combos: [["keys.ctrl", "Y"], ["keys.ctrl", "keys.shift", "Z"]], descriptionKey: "shortcuts.redo" },
      { combos: [["keys.escape"]], descriptionKey: "shortcuts.escape" },
      { combos: [["?"]], descriptionKey: "shortcuts.help" },
    ],
  },
  {
    titleKey: "shortcuts.groupTools",
    items: [
      { combos: [["V"]], descriptionKey: "shortcuts.toolSelect" },
      { combos: [["C"]], descriptionKey: "shortcuts.toolPanel" },
      { combos: [["B"]], descriptionKey: "shortcuts.toolBubble" },
      { combos: [["O"]], descriptionKey: "shortcuts.toolSfx" },
    ],
  },
  {
    titleKey: "shortcuts.groupSelection",
    items: [
      { combos: [["keys.click"]], descriptionKey: "shortcuts.select" },
      { combos: [["keys.shift", "keys.click"]], descriptionKey: "shortcuts.selectAdd" },
      { combos: [["keys.doubleClick"]], descriptionKey: "shortcuts.panelImage" },
      { combos: [["keys.doubleClick"]], descriptionKey: "shortcuts.bubbleText" },
      { combos: [["keys.drag"]], descriptionKey: "shortcuts.bubbleTail" },
      { combos: [["keys.doubleClick"]], descriptionKey: "shortcuts.sfxText" },
      { combos: [["keys.drag"]], descriptionKey: "shortcuts.rotate" },
      { combos: [["keys.delete"], ["keys.backspace"]], descriptionKey: "shortcuts.delete" },
      { combos: [["keys.ctrl", "D"]], descriptionKey: "shortcuts.duplicate" },
      { combos: [["keys.arrows"]], descriptionKey: "shortcuts.nudge" },
      { combos: [["keys.shift", "keys.arrows"]], descriptionKey: "shortcuts.nudgeFast" },
    ],
  },
  {
    titleKey: "shortcuts.groupView",
    items: [
      { combos: [["keys.ctrl", "keys.wheel"]], descriptionKey: "shortcuts.zoom" },
      { combos: [["keys.wheel"]], descriptionKey: "shortcuts.scroll" },
      { combos: [["keys.shift", "keys.wheel"]], descriptionKey: "shortcuts.scrollHorizontal" },
      { combos: [["keys.space", "keys.drag"]], descriptionKey: "shortcuts.pan" },
    ],
  },
];
