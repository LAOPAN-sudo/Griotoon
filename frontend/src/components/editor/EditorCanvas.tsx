"use client";

// Konva canvas of the editor. It only RENDERS the page document from the
// store; every change goes through editorStore actions, committed at the END
// of a gesture (drag end, transform end, mouse up) so that one gesture = one
// undo step. Loaded with next/dynamic({ ssr: false }) because Konva needs a browser.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import { useEditorStore, type ElementPatch } from "@/store/editorStore";
import { useViewStore } from "@/store/viewStore";
import { useUiStore } from "@/store/uiStore";
import { wheelDeltaPixels, wheelZoomFactor } from "@/lib/viewport";
import { boundsOf, rectFromPoints, toLocal, topmostAt, type Box } from "@/lib/geometry";
import { buildSnapTargets, snapBox, snapPoint, SNAP_TOLERANCE_PX, type Guides } from "@/lib/snapping";
import { clampCrop, zoomCrop } from "@/lib/image";
import { canvasFontFamily, DEFAULT_BUBBLE_SIZE, defaultTail } from "@/lib/bubbles";
import { useT } from "@/i18n";
import type { Bubble, Panel } from "@/types/page";
import { useSpaceKey } from "./useSpaceKey";
import { PanelNode, useImageElement } from "./PanelNode";
import { importImageIntoPanel, openImagePicker } from "./imageImport";
import { BubbleNode } from "./BubbleNode";
import { BubbleTextEditor } from "./BubbleTextEditor";

/** Wait for the comic fonts before drawing text on the canvas (Konva can't redraw by itself when they arrive). */
function useComicFonts() {
  const [fonts, setFonts] = useState<{ ready: boolean; comic: string }>({ ready: false, comic: "Comic Neue" });
  useEffect(() => {
    const comic = canvasFontFamily("Comic Neue");
    const bangers = canvasFontFamily("Bangers");
    const done = () => setFonts({ ready: true, comic });
    if (!document.fonts) return done();
    Promise.all([document.fonts.load(`28px ${comic}`), document.fonts.load(`28px ${bangers}`)]).then(done, done);
  }, []);
  return fonts;
}

/** Smallest panel size, in page pixels. */
const MIN_PANEL_SIZE = 40;
const SELECTION_COLOR = "#2563eb";
const GUIDE_COLOR = "#ec4899";

type Point = { x: number; y: number };

/** Page coordinates are stored as whole pixels (no 629.9999… in the JSON). */
const px = Math.round;
/** Rotation is stored with one decimal. */
const deg = (r: number) => Math.round(r * 10) / 10;

export default function EditorCanvas() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const page = useEditorStore((s) => s.page);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const tool = useEditorStore((s) => s.tool);
  const crop = useEditorStore((s) => s.crop);
  const editingId = useEditorStore((s) => s.editingId);
  const fonts = useComicFonts();
  const view = useViewStore((s) => s.view);
  const viewport = useViewStore((s) => s.viewport);
  const spacePressed = useSpaceKey();

  const [isPanning, setIsPanning] = useState(false);
  const [guides, setGuides] = useState<Guides>({});
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null);
  /** Panel under a file being dragged from the computer. */
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const pageSize = useMemo(
    () => ({ width: page.width, height: page.height }),
    [page.width, page.height],
  );

  // ---------------------------------------------------------------- viewport

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
      const rect = el.getBoundingClientRect();
      const { crop, page, updateCrop } = useEditorStore.getState();
      if (crop && !(e.ctrlKey || e.metaKey)) {
        // While cropping, the wheel zooms the image around the cursor.
        const panel = page.panels.find((p) => p.id === crop.panelId);
        if (!panel) return;
        const v = store.view;
        const pagePoint = { x: (e.clientX - rect.left - v.x) / v.scale, y: (e.clientY - rect.top - v.y) / v.scale };
        const anchor = toLocal(panel, pagePoint);
        updateCrop(zoomCrop(panel.w, panel.h, crop.image, crop.image.scale * wheelZoomFactor(delta.y), anchor));
        return;
      }
      if (e.ctrlKey || e.metaKey) {
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

  // --------------------------------------------------------------- selection

  const panels = useMemo(() => [...page.panels].sort((a, b) => a.z - b.z), [page.panels]);
  const bubbles = useMemo(() => [...page.bubbles].sort((a, b) => a.z - b.z), [page.bubbles]);
  /** Selected elements that have a Konva node the Transformer can hold. */
  const selectedNodeIds = useMemo(() => {
    const ids = new Set([...page.panels, ...page.bubbles].map((el) => el.id));
    return selectedIds.filter((id) => ids.has(id));
  }, [page.panels, page.bubbles, selectedIds]);
  const selectionHasBubble = selectedIds.some((id) => page.bubbles.some((b) => b.id === id));
  /** The single selected bubble, if any (gets a tail handle). */
  const soloBubble: Bubble | undefined =
    selectedIds.length === 1 ? page.bubbles.find((b) => b.id === selectedIds[0]) : undefined;

  // Attach the Transformer (selection handles) to the selected Konva nodes.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const nodes = (crop ? [] : selectedNodeIds)
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => !!n);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedNodeIds, page.panels, page.bubbles, crop]);

  const canEdit = tool === "select" && !spacePressed && !crop;

  // ---------------------------------------------------------------- snapping

  /** Snap targets, ignoring the panels being moved. In page pixels. */
  const targetsWithout = useCallback(
    (excluded: string[]) => {
      const { page } = useEditorStore.getState();
      const others: Box[] = page.panels.filter((p) => !excluded.includes(p.id)).map(boundsOf);
      return buildSnapTargets(page, others);
    },
    [],
  );

  const tolerance = () => SNAP_TOLERANCE_PX / useViewStore.getState().view.scale;

  const toPage = (abs: Point): Point => {
    const v = useViewStore.getState().view;
    return { x: (abs.x - v.x) / v.scale, y: (abs.y - v.y) / v.scale };
  };
  const toScreen = (p: Point): Point => {
    const v = useViewStore.getState().view;
    return { x: p.x * v.scale + v.x, y: p.y * v.scale + v.y };
  };

  /** dragBoundFunc for a panel: snaps when it is dragged alone. */
  const panelDragBound = (panel: Panel) =>
    function (this: Konva.Node, absPos: Point): Point {
      const multi = (transformerRef.current?.nodes().length ?? 0) > 1;
      if (multi) return absPos; // moving a group: no snapping (keeps the group intact)
      const pos = toPage(absPos);
      const box = boundsOf({ ...panel, x: pos.x, y: pos.y });
      const snap = snapBox(box, targetsWithout([panel.id]), tolerance());
      setGuides((g) => (g.x === snap.guides.x && g.y === snap.guides.y ? g : snap.guides));
      return toScreen({ x: pos.x + snap.dx, y: pos.y + snap.dy });
    };

  // ------------------------------------------------------------ drag & resize

  const onElementPointerDown = (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!canEdit) return;
    const additive = "shiftKey" in e.evt && e.evt.shiftKey;
    const { selectedIds, select } = useEditorStore.getState();
    if (additive) select(id, true);
    else if (!selectedIds.includes(id)) select(id);
  };

  /**
   * Commit the positions of every moved node in one undo step. With several
   * panels selected, each one fires dragend: the first call saves them all,
   * the next ones change nothing and add no history entry.
   */
  const onElementDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setGuides({});
    const { page, updateElements } = useEditorStore.getState();
    const nodes = new Set([...(transformerRef.current?.nodes() ?? []), e.target]);
    const patches = [...nodes].map((node) => {
      const x = px(node.x());
      const y = px(node.y());
      // If the rounded value equals the previous one, React won't touch the
      // node: align it ourselves so the canvas matches the stored page.
      node.position({ x, y });
      const bubble = page.bubbles.find((b) => b.id === node.id());
      if (!bubble) return { id: node.id(), patch: { x, y } };
      // A bubble carries its tail along, and remembers the panel it now sits on.
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const center = { x: x + bubble.w / 2, y: y + bubble.h / 2 };
      return {
        id: bubble.id,
        patch: {
          x,
          y,
          tail: bubble.tail && { x: bubble.tail.x + dx, y: bubble.tail.y + dy },
          panelId: topmostAt(page.panels, center)?.id,
        },
      };
    });
    updateElements(patches);
  };

  /**
   * Bake the Transformer's scale into w/h, then commit. The image keeps its
   * crop but is refitted if needed so it still covers the resized panel.
   */
  const onTransformEnd = () => {
    setGuides({});
    const { page, updateElements } = useEditorStore.getState();
    const nodes = transformerRef.current?.nodes() ?? [];
    const patches = nodes.flatMap((node): { id: string; patch: ElementPatch }[] => {
      const bubble = page.bubbles.find((b) => b.id === node.id());
      if (bubble) {
        const sx = node.scaleX();
        const sy = node.scaleY();
        const x = px(node.x());
        const y = px(node.y());
        node.setAttrs({ x, y, scaleX: 1, scaleY: 1 });
        return [
          {
            id: bubble.id,
            patch: {
              x,
              y,
              w: px(Math.max(MIN_PANEL_SIZE, bubble.w * sx)),
              h: px(Math.max(MIN_PANEL_SIZE, bubble.h * sy)),
              // The tail was stretched with the bubble on screen: keep it where it was shown.
              tail: bubble.tail && {
                x: px(x + (bubble.tail.x - bubble.x) * sx),
                y: px(y + (bubble.tail.y - bubble.y) * sy),
              },
            },
          },
        ];
      }
      const panel = page.panels.find((p) => p.id === node.id());
      if (!panel) return [];
      const w = px(Math.max(MIN_PANEL_SIZE, panel.w * node.scaleX()));
      const h = px(Math.max(MIN_PANEL_SIZE, panel.h * node.scaleY()));
      const patch = {
        x: px(node.x()),
        y: px(node.y()),
        w,
        h,
        rotation: deg(node.rotation()),
        image: panel.image ? clampCrop(w, h, panel.image) : null,
      };
      node.setAttrs({ x: patch.x, y: patch.y, rotation: patch.rotation, scaleX: 1, scaleY: 1 });
      return [{ id: panel.id, patch }];
    });
    updateElements(patches);
  };

  /** Snap the dragged resize handle (unrotated panels only). */
  const anchorDragBound = (_old: Point, next: Point): Point => {
    const nodes = transformerRef.current?.nodes() ?? [];
    if (nodes.some((n) => n.rotation() !== 0)) return next;
    const snapped = snapPoint(toPage(next), targetsWithout(nodes.map((n) => n.id())), tolerance());
    setGuides(snapped.guides);
    return toScreen(snapped);
  };

  // ---------------------------------------------------- panel tool (drawing)

  const pointerOnPage = (): Point | null => stageRef.current?.getRelativePointerPosition() ?? null;

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (spacePressed) return;
    // A click anywhere but on the image being cropped ends the crop session.
    if (useEditorStore.getState().crop && e.target.name() !== "cropImage") {
      useEditorStore.getState().endCrop();
    }
    if (tool === "bubble") {
      const p = pointerOnPage();
      if (p) placeBubble(p);
      return;
    }
    if (tool === "panel") {
      const p = pointerOnPage();
      if (!p) return;
      const start = snapPoint(p, targetsWithout([]), tolerance());
      setDraft({ start, end: start });
      return;
    }
    // Click on an empty area: clear the selection (unless Shift is held).
    if (e.target === e.target.getStage() && !e.evt.shiftKey) {
      useEditorStore.getState().select(null);
    }
  };

  const onStagePointerMove = () => {
    if (!draft) return;
    const p = pointerOnPage();
    if (!p) return;
    const end = snapPoint(p, targetsWithout([]), tolerance());
    setGuides(end.guides);
    setDraft({ ...draft, end });
  };

  /** Bubble tool: a click places a bubble centred on the pointer and opens its text field. */
  const placeBubble = (p: Point) => {
    const store = useEditorStore.getState();
    const type = store.newBubbleType;
    const { w, h } = DEFAULT_BUBBLE_SIZE[type];
    const box = { x: px(p.x - w / 2), y: px(p.y - h / 2), w, h };
    const tail = defaultTail(box);
    const id = store.addBubble({
      ...box,
      type,
      tail: type === "narration" ? undefined : { x: px(tail.x), y: px(tail.y) },
      panelId: topmostAt(store.page.panels, p)?.id,
    });
    store.startEditing(id); // also selects it and goes back to the Select tool
  };

  const finishDrawing = () => {
    if (!draft) return;
    const rect = rectFromPoints(draft.start, draft.end);
    setDraft(null);
    setGuides({});
    if (rect.w < MIN_PANEL_SIZE || rect.h < MIN_PANEL_SIZE) return; // a click, not a drawing
    const store = useEditorStore.getState();
    const id = store.addPanel({ x: px(rect.x), y: px(rect.y), w: px(rect.w), h: px(rect.h) });
    store.select(id);
    store.setTool("select");
  };

  // Releasing the mouse outside the canvas must also end the drawing.
  const finishDrawingRef = useRef(finishDrawing);
  useEffect(() => {
    finishDrawingRef.current = finishDrawing;
  });
  const isDrawing = draft !== null;
  useEffect(() => {
    if (!isDrawing) return;
    const onUp = () => finishDrawingRef.current();
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [isDrawing]);

  const draftRect = draft ? rectFromPoints(draft.start, draft.end) : null;

  // ------------------------------------------------------------------ images

  /** Double-click: crop the image, or pick one if the panel is empty. */
  const onPanelDblClick = (panel: Panel) => {
    if (tool !== "select" || spacePressed) return;
    if (panel.image) useEditorStore.getState().startCrop(panel.id);
    else openImagePicker(panel.id);
  };

  const cropPanel = crop ? page.panels.find((p) => p.id === crop.panelId) : undefined;
  const cropElement = useImageElement(crop?.image.src);

  /** Dragging the faded full image moves the crop, clamped so the panel stays covered. */
  const onCropDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const { crop, updateCrop } = useEditorStore.getState();
    if (!crop || !cropPanel) return;
    const next = clampCrop(cropPanel.w, cropPanel.h, {
      ...crop.image,
      offsetX: e.target.x(),
      offsetY: e.target.y(),
    });
    e.target.position({ x: next.offsetX, y: next.offsetY });
    updateCrop(next);
  };

  /** Dragging the round tail handle points the bubble elsewhere (one undo step per drag). */
  const onTailDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!soloBubble) return;
    const tail = { x: px(e.target.x()), y: px(e.target.y()) };
    useEditorStore.getState().updateElements([{ id: soloBubble.id, patch: { tail } }], `tail:${soloBubble.id}`);
  };

  /** Page point under a browser drag event (file dragged from the computer). */
  const pagePointOf = (e: React.DragEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return toPage({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  const onFileDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault(); // allow dropping
    e.dataTransfer.dropEffect = "copy";
    const target = topmostAt(useEditorStore.getState().page.panels, pagePointOf(e));
    setDropTargetId(target?.id ?? null);
  };

  const onFileDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setDropTargetId(null);
    const file = e.dataTransfer.files[0];
    const target = topmostAt(useEditorStore.getState().page.panels, pagePointOf(e));
    if (!file) return;
    if (!target) {
      useUiStore.getState().notify("error", "image.errorDropOutside");
      return;
    }
    void importImageIntoPanel(file, target.id);
  };

  const dropTarget = dropTargetId ? page.panels.find((p) => p.id === dropTargetId) : undefined;

  // ------------------------------------------------------------------ render

  const cursor = isPanning
    ? "grabbing"
    : spacePressed
      ? "grab"
      : tool === "panel" || tool === "bubble"
        ? "crosshair"
        : "default";

  /** Guide lines extend a little beyond the page. */
  const extent = Math.max(page.width, page.height) * 2;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t("editor.canvasLabel")}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor }}
      onDragOver={onFileDragOver}
      onDragLeave={(e) => {
        // Only when leaving the canvas, not when moving between its children.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTargetId(null);
      }}
      onDrop={onFileDrop}
    >
      {viewport.width > 0 && viewport.height > 0 && (
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          draggable={spacePressed}
          onDragStart={(e) => {
            if (e.target === e.target.getStage()) setIsPanning(true);
          }}
          onDragMove={onStageDrag}
          onDragEnd={(e) => {
            if (e.target !== e.target.getStage()) return;
            onStageDrag(e);
            setIsPanning(false);
          }}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
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
              <PanelNode
                key={panel.id}
                panel={panel}
                image={crop?.panelId === panel.id ? crop.image : panel.image}
                listening={tool === "select"}
                draggable={canEdit}
                dragBoundFunc={panelDragBound(panel)}
                onPointerDown={(e) => onElementPointerDown(panel.id, e)}
                onDragEnd={onElementDragEnd}
                onDblClick={() => onPanelDblClick(panel)}
              />
            ))}
          </Layer>

          {/* Re-created once the fonts are loaded, so the text is measured with the right font. */}
          <Layer name="bubblesLayer" key={fonts.ready ? "fonts-ready" : "fonts-loading"}>
            {bubbles.map((bubble) => (
              <BubbleNode
                key={bubble.id}
                bubble={bubble}
                fontFamily={fonts.comic}
                editing={editingId === bubble.id}
                listening={tool === "select" && !crop}
                draggable={canEdit && editingId !== bubble.id}
                onPointerDown={(e) => onElementPointerDown(bubble.id, e)}
                onDragEnd={onElementDragEnd}
                onDblClick={() => useEditorStore.getState().startEditing(bubble.id)}
              />
            ))}
          </Layer>

          <Layer name="uiLayer">
            {/* Crop session: the whole image, faded, can be dragged; the panel shows the result. */}
            {crop && cropPanel && cropElement && (
              <Group x={cropPanel.x} y={cropPanel.y} rotation={cropPanel.rotation}>
                <KonvaImage
                  name="cropImage"
                  image={cropElement}
                  x={crop.image.offsetX}
                  y={crop.image.offsetY}
                  width={crop.image.width * crop.image.scale}
                  height={crop.image.height * crop.image.scale}
                  opacity={0.35}
                  draggable={!spacePressed}
                  onDragMove={onCropDragMove}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = "move";
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = "";
                  }}
                />
                <Rect
                  width={cropPanel.w}
                  height={cropPanel.h}
                  stroke={SELECTION_COLOR}
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  dash={[6, 4]}
                  listening={false}
                />
              </Group>
            )}
            {dropTarget && (
              <Rect
                x={dropTarget.x}
                y={dropTarget.y}
                width={dropTarget.w}
                height={dropTarget.h}
                rotation={dropTarget.rotation}
                stroke={SELECTION_COLOR}
                strokeWidth={4}
                strokeScaleEnabled={false}
                fill="rgba(37, 99, 235, 0.12)"
                listening={false}
              />
            )}
            {draftRect && (
              <Rect
                {...draftRect}
                width={draftRect.w}
                height={draftRect.h}
                stroke={SELECTION_COLOR}
                strokeWidth={2}
                strokeScaleEnabled={false}
                dash={[6, 4]}
                fill="rgba(37, 99, 235, 0.08)"
                listening={false}
              />
            )}
            {guides.x !== undefined && (
              <Line
                points={[guides.x, -extent, guides.x, extent]}
                stroke={GUIDE_COLOR}
                strokeWidth={1}
                strokeScaleEnabled={false}
                listening={false}
              />
            )}
            {guides.y !== undefined && (
              <Line
                points={[-extent, guides.y, extent, guides.y]}
                stroke={GUIDE_COLOR}
                strokeWidth={1}
                strokeScaleEnabled={false}
                listening={false}
              />
            )}
            {soloBubble?.tail && tool === "select" && !editingId && (
              <Circle
                name="tailHandle"
                x={soloBubble.tail.x}
                y={soloBubble.tail.y}
                radius={7 / view.scale}
                fill="#FFFFFF"
                stroke={SELECTION_COLOR}
                strokeWidth={2}
                strokeScaleEnabled={false}
                draggable={!spacePressed}
                onDragMove={onTailDragMove}
                onMouseEnter={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = "move";
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = "";
                }}
              />
            )}
            <Transformer
              ref={transformerRef}
              visible={tool === "select" && !crop}
              rotateEnabled={!selectionHasBubble}
              ignoreStroke
              flipEnabled={false}
              keepRatio={false}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={4}
              rotateAnchorOffset={24}
              anchorSize={10}
              anchorCornerRadius={2}
              anchorStroke={SELECTION_COLOR}
              borderStroke={SELECTION_COLOR}
              anchorDragBoundFunc={anchorDragBound}
              boundBoxFunc={(oldBox, newBox) => {
                const min = MIN_PANEL_SIZE * useViewStore.getState().view.scale;
                return Math.abs(newBox.width) < min || Math.abs(newBox.height) < min ? oldBox : newBox;
              }}
              onTransformEnd={onTransformEnd}
            />
          </Layer>
        </Stage>
      )}
      <BubbleTextEditor />
    </div>
  );
}
