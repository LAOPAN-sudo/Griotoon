"use client";

import { useEffect, useState } from "react";
import type Konva from "konva";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type { Panel, PanelImage } from "@/types/page";
import { PANEL_FILL_DEFAULT } from "@/lib/page";

// Decoded images, shared by every panel showing the same src (duplicates,
// undo/redo) so a dataURL is decoded only once.
const cache = new Map<string, HTMLImageElement>();

/** Decode an image (or reuse the cached one). Used before drawing a page off screen. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let img = cache.get(src);
  if (!img) {
    img = new window.Image();
    img.src = src;
    cache.set(src, img);
  }
  const element = img;
  if (element.complete && element.naturalWidth > 0) return Promise.resolve(element);
  return new Promise((resolve, reject) => {
    element.addEventListener("load", () => resolve(element), { once: true });
    element.addEventListener("error", () => reject(new Error("Image could not be decoded")), { once: true });
  });
}

export function useImageElement(src: string | undefined): HTMLImageElement | null {
  const [, forceRender] = useState(0);
  const cached = src ? cache.get(src) : undefined;
  const ready = cached && cached.complete && cached.naturalWidth > 0;

  useEffect(() => {
    if (!src || ready) return;
    let img = cache.get(src);
    if (!img) {
      img = new window.Image();
      img.src = src;
      cache.set(src, img);
    }
    const onLoad = () => forceRender((n) => n + 1);
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src, ready]);

  return ready ? cached : null;
}

/**
 * Part of the image shown in the panel, in the decoded image's pixels.
 * Clamped to the image bounds (some browsers draw nothing otherwise).
 */
export function visiblePart(
  panel: Pick<Panel, "w" | "h">,
  image: PanelImage,
  element?: { naturalWidth: number; naturalHeight: number },
) {
  // The decoded image may differ from the stored size (it should not, but be safe).
  const k = element ? element.naturalWidth / image.width : 1;
  const maxW = element?.naturalWidth ?? image.width;
  const maxH = element?.naturalHeight ?? image.height;
  const x = Math.max(0, (-image.offsetX / image.scale) * k);
  const y = Math.max(0, (-image.offsetY / image.scale) * k);
  return {
    x,
    y,
    width: Math.min(maxW - x, (panel.w / image.scale) * k),
    height: Math.min(maxH - y, (panel.h / image.scale) * k),
  };
}

interface PanelNodeProps {
  panel: Panel;
  /** Image to draw (the crop session's version while cropping). */
  image: PanelImage | null;
  draggable: boolean;
  listening: boolean;
  dragBoundFunc?: (this: Konva.Node, pos: Konva.Vector2d) => Konva.Vector2d;
  onPointerDown?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDblClick?: () => void;
}

/**
 * A panel: background colour (white by default), image clipped to the panel shape, then the
 * border on top. The Group carries the id, position and rotation; the
 * Transformer resizes it by scaling, which EditorCanvas bakes into w/h.
 */
export function PanelNode({
  panel,
  image,
  draggable,
  listening,
  dragBoundFunc,
  onPointerDown,
  onDragEnd,
  onDblClick,
}: PanelNodeProps) {
  const element = useImageElement(image?.src);

  return (
    <Group
      id={panel.id}
      name="panel"
      x={panel.x}
      y={panel.y}
      rotation={panel.rotation}
      draggable={draggable}
      listening={listening}
      dragBoundFunc={dragBoundFunc}
      onPointerDown={onPointerDown}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      <Rect width={panel.w} height={panel.h} fill={panel.fill ?? PANEL_FILL_DEFAULT} />
      {image && element && (
        // Draw only the visible part of the image, exactly the panel's size.
        // (Clipping a bigger image would make the selection frame as big as
        // the whole image.)
        <KonvaImage
          image={element}
          width={panel.w}
          height={panel.h}
          crop={visiblePart(panel, image, element)}
          listening={false}
        />
      )}
      <Rect
        width={panel.w}
        height={panel.h}
        stroke={panel.border.color}
        strokeWidth={panel.border.width}
        listening={false}
      />
    </Group>
  );
}
