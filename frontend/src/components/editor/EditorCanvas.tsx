"use client";

// Konva canvas of the editor. It only RENDERS the page document from the
// store; changes to the page always go through editorStore actions.
// Loaded with next/dynamic({ ssr: false }) because Konva needs a browser.

import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Layer, Rect, Stage } from "react-konva";
import { useEditorStore } from "@/store/editorStore";
import { useViewStore } from "@/store/viewStore";
import { wheelDeltaPixels, wheelZoomFactor } from "@/lib/viewport";
import { useT } from "@/i18n";
import { useSpaceKey } from "./useSpaceKey";

export default function EditorCanvas() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const page = useEditorStore((s) => s.page);
  const view = useViewStore((s) => s.view);
  const viewport = useViewStore((s) => s.viewport);
  const spacePressed = useSpaceKey();
  const [isPanning, setIsPanning] = useState(false);

  const pageSize = useMemo(
    () => ({ width: page.width, height: page.height }),
    [page.width, page.height],
  );

  // Measure the canvas area and follow its size (window resize, side panels…).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      useViewStore
        .getState()
        .setViewport({ width: el.clientWidth, height: el.clientHeight }, pageSize);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageSize]);

  // Wheel: Ctrl/Cmd + wheel (or trackpad pinch) zooms toward the cursor,
  // plain wheel scrolls the view. Native listener because it must be
  // non-passive to stop the browser from zooming the whole page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useViewStore.getState();
      const delta = wheelDeltaPixels(e, el.clientHeight);
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        store.zoomTo(store.view.scale * wheelZoomFactor(delta.y), anchor);
      } else if (e.shiftKey && delta.x === 0) {
        store.panBy(-delta.y, 0); // Shift + wheel scrolls horizontally
      } else {
        store.panBy(-delta.x, -delta.y);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Space + drag: the whole Stage becomes draggable, which moves the view.
  const onStageDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (e.target !== stage || !stage) return; // ignore drags bubbling from shapes
    useViewStore.getState().setPosition(stage.x(), stage.y());
  };

  const panels = useMemo(() => [...page.panels].sort((a, b) => a.z - b.z), [page.panels]);

  const cursor = isPanning ? "grabbing" : spacePressed ? "grab" : "default";

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t("editor.canvasLabel")}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor }}
    >
      {viewport.width > 0 && viewport.height > 0 && (
        <Stage
          width={viewport.width}
          height={viewport.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          draggable={spacePressed}
          onDragStart={() => setIsPanning(true)}
          onDragMove={onStageDrag}
          onDragEnd={(e) => {
            onStageDrag(e);
            setIsPanning(false);
          }}
        >
          <Layer name="panelsLayer">
            {/* The page sheet: coordinates are page pixels (1240 × 1754 for A4). */}
            <Rect
              name="page"
              width={page.width}
              height={page.height}
              fill={page.background}
              shadowColor="black"
              shadowOpacity={0.25}
              shadowBlur={24}
              shadowOffsetY={6}
              listening={false}
            />
            {panels.map((panel) => (
              <Rect
                key={panel.id}
                id={panel.id}
                x={panel.x}
                y={panel.y}
                width={panel.w}
                height={panel.h}
                rotation={panel.rotation}
                stroke={panel.border.color}
                strokeWidth={panel.border.width}
                fill="#FFFFFF"
              />
            ))}
          </Layer>
          {/* Filled in later steps: bubbles and sfx, then selection handles. */}
          <Layer name="bubblesLayer" />
          <Layer name="uiLayer" />
        </Stage>
      )}
    </div>
  );
}
