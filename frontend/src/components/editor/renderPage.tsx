"use client";

// Draws a page from its JSON in a hidden canvas, without the editor: used by
// the export (every page of the chapter, not only the one on screen) and by
// the page thumbnails. Same components as the editor canvas, so the result
// looks exactly like the page being edited, minus selection and handles.

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type Konva from "konva";
import { Layer, Rect, Stage } from "react-konva";
import { canvasFontFamily } from "@/lib/bubbles";
import { SFX_FONT } from "@/lib/sfx";
import type { Bubble, Page, Sfx } from "@/types/page";
import { BubbleNode } from "./BubbleNode";
import { loadImage, PanelNode } from "./PanelNode";
import { SfxNode } from "./SfxNode";

function StaticPage({ page, onReady }: { page: Page; onReady: (stage: Konva.Stage) => void }) {
  const stageRef = useRef<Konva.Stage>(null);
  // Effects run after the children's layout effects (bubble text centring), so the stage is final here.
  useEffect(() => {
    if (stageRef.current) onReady(stageRef.current);
  }, [onReady]);

  const comic = canvasFontFamily("Comic Neue");
  const bangers = canvasFontFamily(SFX_FONT);
  const panels = page.panels.filter((p) => !p.hidden).sort((a, b) => a.z - b.z);
  const texts = [
    ...page.bubbles.map((el) => ({ kind: "bubble" as const, el })),
    ...page.sfx.map((el) => ({ kind: "sfx" as const, el })),
  ]
    .filter((item) => !item.el.hidden)
    .sort((a, b) => a.el.z - b.el.z);
  const off = { editing: false, draggable: false, listening: false };

  return (
    <Stage ref={stageRef} width={page.width} height={page.height} listening={false}>
      <Layer>
        <Rect width={page.width} height={page.height} fill={page.background} />
        {panels.map((panel) => (
          <PanelNode key={panel.id} panel={panel} image={panel.image} draggable={false} listening={false} />
        ))}
      </Layer>
      <Layer>
        {texts.map(({ kind, el }) =>
          kind === "bubble" ? (
            <BubbleNode key={el.id} bubble={el as Bubble} fontFamily={comic} {...off} />
          ) : (
            <SfxNode key={el.id} sfx={el as Sfx} fontFamily={bangers} {...off} />
          ),
        )}
      </Layer>
    </Stage>
  );
}

/**
 * Draw `page` into a new canvas, `pixelRatio` times its size in pixels.
 * Waits for the images and fonts first, so nothing is missing.
 */
export async function renderPageCanvas(page: Page, pixelRatio: number): Promise<HTMLCanvasElement> {
  const sources = page.panels.filter((p) => !p.hidden && p.image).map((p) => p.image!.src);
  await Promise.all([...new Set(sources)].map(loadImage));
  await document.fonts?.ready;

  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    const stage = await new Promise<Konva.Stage>((resolve) => root.render(<StaticPage page={page} onReady={resolve} />));
    return stage.toCanvas({ pixelRatio });
  } finally {
    root.unmount();
  }
}
