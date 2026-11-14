"use client";

import type Konva from "konva";
import { Group, Shape, Text } from "react-konva";
import type { Bubble } from "@/types/page";
import { BUBBLE_LINE_HEIGHT, BUBBLE_STROKE_WIDTH, bubblePath, tailToLocal, textBox, tracePath } from "@/lib/bubbles";

interface BubbleNodeProps {
  bubble: Bubble;
  /** Real CSS font family for the canvas (see canvasFontFamily). */
  fontFamily: string;
  /** Hide the canvas text while the HTML text field is open on top of it. */
  editing: boolean;
  draggable: boolean;
  listening: boolean;
  onPointerDown?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDblClick?: () => void;
}

/**
 * A bubble: the outline (with its tail) drawn from bubblePath, then the text.
 * The Shape declares only the box size, so the selection frame surrounds the
 * bubble without its tail.
 */
export function BubbleNode({
  bubble,
  fontFamily,
  editing,
  draggable,
  listening,
  onPointerDown,
  onDragEnd,
  onDblClick,
}: BubbleNodeProps) {
  const { w, h, type } = bubble;
  // The tail is stored in page coordinates; draw it in the bubble's own (rotated) axes.
  const tail = tailToLocal(bubble);
  const box = textBox(type, w, h);

  return (
    <Group
      id={bubble.id}
      name="bubble"
      x={bubble.x}
      y={bubble.y}
      rotation={bubble.rotation}
      draggable={draggable}
      listening={listening}
      onPointerDown={onPointerDown}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      <Shape
        width={w}
        height={h}
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth={BUBBLE_STROKE_WIDTH}
        lineJoin="round"
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          tracePath(ctx, bubblePath(type, w, h, tail));
          ctx.fillStrokeShape(shape);
        }}
      />
      {!editing && (
        <Text
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          text={bubble.text}
          fontFamily={fontFamily}
          fontSize={bubble.fontSize}
          lineHeight={BUBBLE_LINE_HEIGHT}
          align={bubble.align}
          verticalAlign="middle"
          wrap="word"
          fill="#111111"
          listening={false}
        />
      )}
    </Group>
  );
}
