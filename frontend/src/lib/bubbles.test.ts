import { describe, expect, it } from "vitest";
import { bubblePath, BUBBLE_TYPES, defaultTail, textBox, tracePath, type PathCommand } from "./bubbles";

const W = 300;
const H = 150;
const below = { x: 80, y: 260 }; // tail tip under the bubble (local coords)

const ops = (cmds: PathCommand[]) => cmds.map((c) => c.op);

describe("speech bubble", () => {
  it("is one closed path ending with the tail tip", () => {
    const cmds = bubblePath("speech", W, H, below);
    expect(ops(cmds)).toEqual(["move", "ellipse", "line", "close"]);
    expect(cmds[2]).toEqual({ op: "line", ...below });
  });

  it("starts the tail base on the ellipse, on the side of the tail", () => {
    const move = bubblePath("speech", W, H, below)[0] as { x: number; y: number };
    const onEllipse = ((move.x - W / 2) / (W / 2)) ** 2 + ((move.y - H / 2) / (H / 2)) ** 2;
    expect(onEllipse).toBeCloseTo(1);
    expect(move.y).toBeGreaterThan(H / 2); // lower half, toward the tail
  });

  it("draws no tail when the tip is inside the bubble or missing", () => {
    expect(ops(bubblePath("speech", W, H, { x: W / 2, y: H / 2 }))).toEqual(["ellipse", "close"]);
    expect(ops(bubblePath("speech", W, H))).toEqual(["ellipse", "close"]);
  });
});

describe("thought bubble", () => {
  it("is a cloud followed by three shrinking circles toward the tail", () => {
    const cmds = bubblePath("thought", W, H, below);
    const circles = cmds.filter((c): c is Extract<PathCommand, { op: "circle" }> => c.op === "circle");
    expect(cmds.filter((c) => c.op === "quad").length).toBeGreaterThanOrEqual(8);
    expect(circles).toHaveLength(3);
    expect(circles[0].r).toBeGreaterThan(circles[1].r);
    expect(circles[1].r).toBeGreaterThan(circles[2].r);
    // The last circle is close to the tip.
    expect(Math.hypot(circles[2].cx - below.x, circles[2].cy - below.y)).toBeLessThan(25);
  });
});

describe("shout bubble", () => {
  it("is spiky and one spike reaches the tail tip", () => {
    const cmds = bubblePath("shout", W, H, below);
    expect(cmds.filter((c) => c.op === "line").length).toBeGreaterThanOrEqual(19);
    expect(cmds).toContainEqual(expect.objectContaining({ x: below.x, y: below.y }));
  });

  it("works without a tail", () => {
    const cmds = bubblePath("shout", W, H);
    expect(cmds).not.toContainEqual(expect.objectContaining({ x: below.x, y: below.y }));
  });
});

describe("narration box", () => {
  it("is a plain rectangle and ignores the tail", () => {
    expect(bubblePath("narration", W, H, below)).toEqual([
      { op: "move", x: 0, y: 0 },
      { op: "line", x: W, y: 0 },
      { op: "line", x: W, y: H },
      { op: "line", x: 0, y: H },
      { op: "close" },
    ]);
  });
});

describe("text box", () => {
  it.each(BUBBLE_TYPES)("%s: text area is centred inside the bubble", (type) => {
    const b = textBox(type, W, H);
    expect(b.x).toBeGreaterThan(0);
    expect(b.y).toBeGreaterThan(0);
    expect(b.x + b.w).toBeLessThan(W);
    expect(b.y + b.h).toBeLessThan(H);
    expect(b.x + b.w / 2).toBeCloseTo(W / 2);
    expect(b.y + b.h / 2).toBeCloseTo(H / 2);
  });

  it("text corners of a speech bubble stay inside the ellipse", () => {
    const b = textBox("speech", W, H);
    const inside = ((b.x - W / 2) / (W / 2)) ** 2 + ((b.y - H / 2) / (H / 2)) ** 2;
    expect(inside).toBeLessThanOrEqual(1);
  });
});

describe("helpers", () => {
  it("puts the default tail under the bubble", () => {
    expect(defaultTail({ x: 100, y: 100, w: 300, h: 150 })).toEqual({ x: 190, y: 340 });
  });

  it("replays commands on a canvas context", () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, name: string) => () => calls.push(name) });
    tracePath(ctx as unknown as CanvasRenderingContext2D, bubblePath("thought", W, H, below));
    expect(calls[0]).toBe("moveTo");
    expect(calls).toContain("quadraticCurveTo");
    expect(calls).toContain("arc");
  });
});
