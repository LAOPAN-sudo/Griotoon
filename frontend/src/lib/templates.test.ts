import { describe, expect, it } from "vitest";
import { createEmptyPage } from "./page";
import { getTemplate, slotToGeometry, TEMPLATES, type TemplateId } from "./templates";
import type { Panel } from "@/types/page";
import { boundsOf } from "./geometry";

const page = createEmptyPage();

const bbox = boundsOf;

const expectedCounts: Record<TemplateId, number> = {
  full: 1,
  "two-strips": 2,
  "three-strips": 3,
  "grid-2x2": 4,
  "manga-classic": 4,
  action: 5,
  webtoon: 3,
};

describe("templates", () => {
  it("offers at least the 7 templates of the spec", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(expectedCounts).sort());
  });

  describe.each(TEMPLATES)("$id", (template) => {
    const panels = template.build(page);

    it("has the expected number of panels", () => {
      expect(panels).toHaveLength(expectedCounts[template.id]);
    });

    it("stays inside the page margins", () => {
      for (const p of panels) {
        const b = bbox(p);
        expect(b.left).toBeGreaterThanOrEqual(page.margin - 1);
        expect(b.top).toBeGreaterThanOrEqual(page.margin - 1);
        expect(b.right).toBeLessThanOrEqual(page.width - page.margin + 1);
        expect(b.bottom).toBeLessThanOrEqual(page.height - page.margin + 1);
      }
    });

    it("keeps at least one gutter between panels", () => {
      for (let i = 0; i < panels.length; i++) {
        for (let j = i + 1; j < panels.length; j++) {
          const a = bbox(panels[i]);
          const b = bbox(panels[j]);
          const gapX = Math.max(b.left - a.right, a.left - b.right);
          const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
          expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(page.gutter - 2);
        }
      }
    });

    it("creates fresh empty panels with unique ids and z in order", () => {
      expect(new Set(panels.map((p) => p.id)).size).toBe(panels.length);
      expect(panels.map((p) => p.z)).toEqual(panels.map((_, i) => i));
      for (const p of panels) expect(p.image).toBeNull();
    });
  });

  it("uses the whole usable width for a full page", () => {
    const [p] = getTemplate("full").build(page);
    expect(p).toMatchObject({ x: 60, y: 60, w: 1120, h: 1634, rotation: 0 });
  });

  it("follows the page margin and gutter settings", () => {
    const custom = { ...page, margin: 100, gutter: 40 };
    const [top, bottom] = getTemplate("two-strips").build(custom);
    expect(top.x).toBe(100);
    expect(bottom.y - (top.y + top.h)).toBe(40);
  });

  it("produces new ids on every call", () => {
    const a = getTemplate("grid-2x2").build(page);
    const b = getTemplate("grid-2x2").build(page);
    expect(a[0].id).not.toBe(b[0].id);
  });
});

describe("slotToGeometry", () => {
  it("fills a rotated slot exactly with the rotated panel", () => {
    const slot = { x: 60, y: 600, w: 1120, h: 450, rotation: -4 };
    const g = slotToGeometry(slot);
    const b = bbox({ ...g } as Panel);
    expect(b.left).toBeCloseTo(slot.x, -0.5);
    expect(b.right).toBeCloseTo(slot.x + slot.w, -0.5);
    expect(b.top).toBeCloseTo(slot.y, -0.5);
    expect(b.bottom).toBeCloseTo(slot.y + slot.h, -0.5);
  });
});
