// Speech bubble shapes, as pure geometry. A bubble outline is a list of path
// commands in the bubble's local coordinates (0,0 = top-left of its box);
// the canvas just replays them. This keeps the shapes testable and makes the
// editor, PNG and PDF export draw exactly the same thing.

import type { BubbleType } from "@/types/page";

export type PathCommand =
  | { op: "move"; x: number; y: number }
  | { op: "line"; x: number; y: number }
  | { op: "quad"; cx: number; cy: number; x: number; y: number }
  | { op: "ellipse"; cx: number; cy: number; rx: number; ry: number; start: number; end: number }
  | { op: "circle"; cx: number; cy: number; r: number }
  | { op: "close" };

type Point = { x: number; y: number };

export const BUBBLE_TYPES: BubbleType[] = ["speech", "thought", "shout", "narration"];
export const BUBBLE_STROKE_WIDTH = 3;
export const BUBBLE_LINE_HEIGHT = 1.15;
/** Default size of a new bubble, page pixels. */
export const DEFAULT_BUBBLE_SIZE: Record<BubbleType, { w: number; h: number }> = {
  speech: { w: 320, h: 160 },
  thought: { w: 320, h: 180 },
  shout: { w: 360, h: 200 },
  narration: { w: 360, h: 110 },
};

/** Default tail tip for a new bubble: below and slightly left of the box. */
export function defaultTail(box: { x: number; y: number; w: number; h: number }): Point {
  return { x: box.x + box.w * 0.3, y: box.y + box.h + 90 };
}

const TAU = Math.PI * 2;

/** Ellipse filling the box. `t` is the parametric angle. */
function ellipseOf(w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  return {
    cx,
    cy,
    rx,
    ry,
    at: (t: number, k = 1): Point => ({ x: cx + rx * k * Math.cos(t), y: cy + ry * k * Math.sin(t) }),
    /** Parametric angle pointing toward p. */
    angleTo: (p: Point) => Math.atan2((p.y - cy) / ry, (p.x - cx) / rx),
    /** True when p is inside the ellipse (a tail there would be invisible). */
    contains: (p: Point) => ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 <= 1,
  };
}

/** Ellipse with a triangular tail: one closed path, so no seam where they meet. */
function speechPath(w: number, h: number, tail?: Point): PathCommand[] {
  const e = ellipseOf(w, h);
  if (!tail || e.contains(tail)) {
    return [{ op: "ellipse", cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, start: 0, end: TAU }, { op: "close" }];
  }
  const t = e.angleTo(tail);
  // Half-width of the tail base, as a parametric angle (about 1/8 of the smaller side).
  const delta = Math.min(0.45, (Math.min(w, h) * 0.13) / ((e.rx + e.ry) / 2));
  const start = e.at(t + delta);
  return [
    { op: "move", x: start.x, y: start.y },
    // The long way round, from one side of the tail base to the other.
    { op: "ellipse", cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, start: t + delta, end: t - delta + TAU },
    { op: "line", x: tail.x, y: tail.y },
    { op: "close" },
  ];
}

/** Cloud made of bumps along an ellipse, plus small circles trailing to the tail. */
function thoughtPath(w: number, h: number, tail?: Point): PathCommand[] {
  const e = ellipseOf(w * 0.92, h * 0.88);
  const ox = w * 0.04;
  const oy = h * 0.06;
  const bumps = Math.max(8, Math.round((w + h) / 45));
  const cmds: PathCommand[] = [];
  for (let i = 0; i <= bumps; i++) {
    const p = e.at((i / bumps) * TAU);
    if (i === 0) {
      cmds.push({ op: "move", x: p.x + ox, y: p.y + oy });
      continue;
    }
    const c = e.at(((i - 0.5) / bumps) * TAU, 1.22); // control point pushed outward
    cmds.push({ op: "quad", cx: c.x + ox, cy: c.y + oy, x: p.x + ox, y: p.y + oy });
  }
  cmds.push({ op: "close" });

  const full = ellipseOf(w, h);
  if (tail && !full.contains(tail)) {
    const edge = full.at(full.angleTo(tail));
    const base = Math.min(w, h) * 0.09;
    // Three circles from the cloud to the tip, getting smaller.
    [0.3, 0.62, 0.92].forEach((k, i) => {
      cmds.push({
        op: "circle",
        cx: edge.x + (tail.x - edge.x) * k,
        cy: edge.y + (tail.y - edge.y) * k,
        r: base * (1 - i * 0.3),
      });
    });
  }
  return cmds;
}

/** Spiky outline; the spike closest to the tail direction becomes the tail. */
function shoutPath(w: number, h: number, tail?: Point): PathCommand[] {
  const e = ellipseOf(w, h);
  const spikes = Math.max(10, Math.round((w + h) / 32));
  const tailAngle = tail && !e.contains(tail) ? e.angleTo(tail) : null;
  let tailSpike = -1;
  if (tailAngle !== null) {
    const normalized = ((tailAngle % TAU) + TAU) % TAU;
    tailSpike = Math.round((normalized / TAU) * spikes) % spikes;
  }
  const cmds: PathCommand[] = [];
  for (let i = 0; i < spikes; i++) {
    const t = (i / spikes) * TAU;
    // Slightly irregular spikes look more hand-drawn (deterministic, no randomness).
    const outer = i === tailSpike && tail ? tail : e.at(t, 1 + 0.06 * Math.sin(i * 2.3));
    const inner = e.at(t + Math.PI / spikes, 0.8);
    cmds.push(i === 0 ? { op: "move", ...outer } : { op: "line", ...outer });
    cmds.push({ op: "line", ...inner });
  }
  cmds.push({ op: "close" });
  return cmds;
}

function narrationPath(w: number, h: number): PathCommand[] {
  return [
    { op: "move", x: 0, y: 0 },
    { op: "line", x: w, y: 0 },
    { op: "line", x: w, y: h },
    { op: "line", x: 0, y: h },
    { op: "close" },
  ];
}

/** Outline of a bubble. `tail` is in local coordinates (relative to the box). */
export function bubblePath(type: BubbleType, w: number, h: number, tail?: Point): PathCommand[] {
  switch (type) {
    case "speech":
      return speechPath(w, h, tail);
    case "thought":
      return thoughtPath(w, h, tail);
    case "shout":
      return shoutPath(w, h, tail);
    case "narration":
      return narrationPath(w, h);
  }
}

/** Area where the text goes, inside the outline (local coordinates). */
export function textBox(type: BubbleType, w: number, h: number) {
  // Largest rectangle inside an ellipse is w/√2 × h/√2; spikes and clouds eat a bit more.
  const k = type === "narration" ? 1 : type === "shout" ? 0.56 : type === "thought" ? 0.64 : 0.7;
  const pad = type === "narration" ? 14 : 0;
  const bw = w * k - 2 * pad;
  const bh = h * k - 2 * pad;
  return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
}

/** Replay path commands on a canvas 2D context (Konva's context has the same API). */
export function tracePath(
  ctx: Pick<
    CanvasRenderingContext2D,
    "moveTo" | "lineTo" | "quadraticCurveTo" | "ellipse" | "arc" | "closePath"
  >,
  cmds: PathCommand[],
) {
  for (const c of cmds) {
    switch (c.op) {
      case "move":
        ctx.moveTo(c.x, c.y);
        break;
      case "line":
        ctx.lineTo(c.x, c.y);
        break;
      case "quad":
        ctx.quadraticCurveTo(c.cx, c.cy, c.x, c.y);
        break;
      case "ellipse":
        ctx.ellipse(c.cx, c.cy, c.rx, c.ry, 0, c.start, c.end);
        break;
      case "circle":
        ctx.moveTo(c.cx + c.r, c.cy);
        ctx.arc(c.cx, c.cy, c.r, 0, TAU);
        break;
      case "close":
        ctx.closePath();
        break;
    }
  }
}

// Fonts are stored by name in the page JSON ("Comic Neue"); the canvas needs
// the real CSS family generated by next/font (exposed as CSS variables).
const FONT_VARIABLES: Record<string, string> = {
  "Comic Neue": "--font-comic-neue",
  Bangers: "--font-bangers",
};

export function canvasFontFamily(name: string): string {
  const variable = FONT_VARIABLES[name];
  if (!variable || typeof document === "undefined") return name;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || name;
}
