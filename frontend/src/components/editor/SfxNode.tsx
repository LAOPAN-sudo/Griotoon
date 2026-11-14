"use client";

import type Konva from "konva";
import { Text } from "react-konva";
import type { Sfx } from "@/types/page";
import { SFX_LINE_HEIGHT, sfxStrokeWidth } from "@/lib/sfx";

interface SfxNodeProps {
  sfx: Sfx;
  /** Real CSS font family for the canvas (Bangers, see canvasFontFamily). */
  fontFamily: string;
  editing: boolean;
  draggable: boolean;
  listening: boolean;
  onPointerDown?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDblClick?: () => void;
}

/** A sound effect: outlined text, the outline drawn behind the fill (comic style). */
export function SfxNode({
  sfx,
  fontFamily,
  editing,
  draggable,
  listening,
  onPointerDown,
  onDragEnd,
  onDblClick,
}: SfxNodeProps) {
  return (
    <Text
      id={sfx.id}
      name="sfx"
      x={sfx.x}
      y={sfx.y}
      rotation={sfx.rotation}
      text={sfx.text}
      fontFamily={fontFamily}
      fontSize={sfx.fontSize}
      lineHeight={SFX_LINE_HEIGHT}
      fill={sfx.color}
      stroke={sfx.strokeColor}
      strokeWidth={sfxStrokeWidth(sfx.fontSize)}
      fillAfterStrokeEnabled
      lineJoin="round"
      // Hidden (not removed) while the text field is open, so the selection stays attached.
      opacity={editing ? 0 : 1}
      draggable={draggable}
      listening={listening}
      onPointerDown={onPointerDown}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    />
  );
}
