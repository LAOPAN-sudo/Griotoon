import { describe, expect, it } from "vitest";
import { matchShortcut, SHORTCUT_GROUPS } from "./shortcuts";

const key = (k: string, mods: Partial<{ ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }> = {}) =>
  matchShortcut({
    key: k,
    ctrlKey: !!mods.ctrl,
    metaKey: !!mods.meta,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
  });

describe("matchShortcut", () => {
  it("maps undo / redo, with Ctrl or Cmd", () => {
    expect(key("z", { ctrl: true })).toEqual({ type: "undo" });
    expect(key("z", { meta: true })).toEqual({ type: "undo" });
    expect(key("y", { ctrl: true })).toEqual({ type: "redo" });
    expect(key("Z", { ctrl: true, shift: true })).toEqual({ type: "redo" });
  });

  it("maps delete, duplicate and escape", () => {
    expect(key("Delete")).toEqual({ type: "delete" });
    expect(key("Backspace")).toEqual({ type: "delete" });
    expect(key("d", { ctrl: true })).toEqual({ type: "duplicate" });
    expect(key("Escape")).toEqual({ type: "escape" });
  });

  it("nudges by 1 px, or 10 px with Shift", () => {
    expect(key("ArrowLeft")).toEqual({ type: "nudge", dx: -1, dy: 0 });
    expect(key("ArrowDown", { shift: true })).toEqual({ type: "nudge", dx: 0, dy: 10 });
  });

  it("switches tools with single letters", () => {
    expect(key("c")).toEqual({ type: "tool", tool: "panel" });
    expect(key("C")).toEqual({ type: "tool", tool: "panel" });
    expect(key("v")).toEqual({ type: "tool", tool: "select" });
  });

  it("ignores other keys and Alt combinations", () => {
    expect(key("x")).toBeNull();
    expect(key("c", { ctrl: true })).toBeNull(); // copy stays with the browser
    expect(key("z", { ctrl: true, alt: true })).toBeNull();
  });
});

describe("help list", () => {
  it("maps ? to the help dialog", () => {
    expect(key("?", { shift: true })).toEqual({ type: "help" });
  });

  // Every keyboard combination shown in the dialog must really do something.
  // Mouse gestures (click, drag, wheel) are handled by the canvas, not here.
  it("only lists keyboard shortcuts that exist", () => {
    const named: Record<string, string> = {
      "keys.escape": "Escape",
      "keys.delete": "Delete",
      "keys.backspace": "Backspace",
      "keys.arrows": "ArrowLeft",
    };
    const mouse = ["keys.click", "keys.drag", "keys.wheel", "keys.space"];
    let checked = 0;
    for (const group of SHORTCUT_GROUPS) {
      for (const item of group.items) {
        for (const combo of item.combos) {
          if (combo.some((k) => mouse.includes(k))) continue;
          const main = combo.find((k) => k !== "keys.ctrl" && k !== "keys.shift")!;
          const action = matchShortcut({
            key: named[main] ?? main,
            ctrlKey: combo.includes("keys.ctrl"),
            metaKey: false,
            shiftKey: combo.includes("keys.shift") || main === "?",
            altKey: false,
          });
          expect(action, `${item.descriptionKey}: ${combo.join(" + ")}`).not.toBeNull();
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});
