"use client";

import { useShallow } from "zustand/react/shallow";
import { useT, type MessageKey } from "@/i18n";
import { BUBBLE_TYPES } from "@/lib/bubbles";
import { clampSfxFontSize, SFX_COLORS, SFX_STROKES } from "@/lib/sfx";
import { bubbleGeometryPatch, panelGeometryPatch, sfxGeometryPatch } from "@/lib/properties";
import { useEditorStore, type ElementPatch } from "@/store/editorStore";
import { PANEL_FILL_DEFAULT } from "@/lib/page";
import type { Bubble, BubbleType, Panel, Sfx } from "@/types/page";
import { openImagePicker } from "../imageImport";
import { AlignIcon, BubbleTypeIcon } from "../icons";
import { ColorField, NumberField, Row, Section, Segmented, TextField } from "./fields";

const BUBBLE_TYPE_LABELS: Record<BubbleType, MessageKey> = {
  speech: "bubble.speech",
  thought: "bubble.thought",
  shout: "bubble.shout",
  narration: "bubble.narration",
};

type T = ReturnType<typeof useT>;

/** Apply the same patch (or a patch computed per element) to elements, in one undo step. */
function applyTo<E extends { id: string }>(
  elements: E[],
  patch: ElementPatch | ((el: E) => ElementPatch),
  mergeKey?: string,
) {
  useEditorStore.getState().updateElements(
    elements.map((el) => ({ id: el.id, patch: typeof patch === "function" ? patch(el) : patch })),
    mergeKey,
  );
}

/** Value shared by all elements, or null when they differ. */
function common<E, V>(elements: E[], get: (el: E) => V): V | null {
  const first = get(elements[0]);
  return elements.every((el) => get(el) === first) ? first : null;
}

/** Contextual properties: the page, the Bubble tool, or the selected elements. */
export function PropertiesPanel() {
  const t = useT();
  const tool = useEditorStore((s) => s.tool);
  // One selector per array: useShallow compares the array items (the element
  // objects, which only change when edited), so React re-renders only when needed.
  const panels = useEditorStore(useShallow((s) => s.page.panels.filter((p) => s.selectedIds.includes(p.id))));
  const bubbles = useEditorStore(useShallow((s) => s.page.bubbles.filter((b) => s.selectedIds.includes(b.id))));
  const sfx = useEditorStore(useShallow((s) => s.page.sfx.filter((x) => s.selectedIds.includes(x.id))));
  const count = panels.length + bubbles.length + sfx.length;

  let content: React.ReactNode;
  if (tool === "bubble") content = <NewBubble t={t} />;
  else if (tool === "sfx") content = <Hint title={t("sfx.barTitle")} text={t("sfx.hintPlace")} />;
  else if (tool === "panel") content = <Hint title={t("toolbar.panel")} text={t("properties.panelToolHint")} />;
  else if (count === 0) content = <PageProperties t={t} />;
  else if (panels.length === count) content = <PanelProperties t={t} panels={panels} />;
  else if (bubbles.length === count) content = <BubbleProperties t={t} bubbles={bubbles} />;
  else if (sfx.length === count) content = <SfxProperties t={t} sfx={sfx} />;
  else content = <Hint title={t("properties.title")} text={t("properties.mixed", { count })} />;

  return (
    <div aria-label={t("properties.title")} role="region">
      {content}
      {count > 0 && tool === "select" && <SelectionActions t={t} count={count} />}
    </div>
  );
}

function Hint({ title, text }: { title: string; text: string }) {
  return (
    <Section title={title}>
      <p className="text-sm text-zinc-600">{text}</p>
    </Section>
  );
}

function SelectionActions({ t, count }: { t: T; count: number }) {
  const buttonClass = "flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100";
  return (
    <div className="flex gap-2 px-4 py-3">
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          const { selectedIds, duplicate } = useEditorStore.getState();
          duplicate(selectedIds);
        }}
      >
        {t("properties.duplicate")}
      </button>
      <button
        type="button"
        className={`${buttonClass} text-red-700 hover:bg-red-50`}
        onClick={() => {
          const { selectedIds, removeElement } = useEditorStore.getState();
          removeElement(selectedIds);
        }}
      >
        {count > 1 ? t("properties.deleteMany", { count }) : t("properties.delete")}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------- page

const PAGE_BACKGROUNDS = [
  { value: "#FFFFFF", key: "properties.bgWhite" },
  { value: "#FFF8E7", key: "properties.bgCream" },
  { value: "#F4F4F5", key: "properties.bgGrey" },
  { value: "#111111", key: "properties.bgBlack" },
] as const;

function PageProperties({ t }: { t: T }) {
  const page = useEditorStore(useShallow((s) => ({ background: s.page.background, margin: s.page.margin, gutter: s.page.gutter, width: s.page.width, height: s.page.height })));
  const update = useEditorStore((s) => s.updatePage);
  return (
    <Section title={t("properties.page")}>
      <p className="text-xs text-zinc-500">{t("properties.pageSize", { width: page.width, height: page.height })}</p>
      <ColorField
        label={t("properties.background")}
        value={page.background}
        swatches={PAGE_BACKGROUNDS.map((b) => ({ value: b.value, label: t(b.key) }))}
        customLabel={t("sfx.colorCustom")}
        onPick={(background, m) => update({ background }, m ? "page:background" : undefined)}
      />
      <Row>
        <NumberField label={t("properties.margin")} value={page.margin} min={0} max={400} unit="px" onCommit={(margin, m) => update({ margin }, m ? "page:margin" : undefined)} />
        <NumberField label={t("properties.gutter")} value={page.gutter} min={0} max={200} unit="px" onCommit={(gutter, m) => update({ gutter }, m ? "page:gutter" : undefined)} />
      </Row>
      <p className="text-xs text-zinc-500">{t("properties.spacingHelp")}</p>
    </Section>
  );
}

// ------------------------------------------------------------- geometry

function GeometryFields({
  t,
  values,
  onChange,
  withSize = true,
}: {
  t: T;
  values: { x: number; y: number; w?: number; h?: number; rotation: number };
  onChange: (change: Partial<{ x: number; y: number; w: number; h: number; rotation: number }>, merge: boolean) => void;
  withSize?: boolean;
}) {
  return (
    <>
      <Row>
        <NumberField label="X" value={values.x} unit="px" onCommit={(x, m) => onChange({ x }, m)} />
        <NumberField label="Y" value={values.y} unit="px" onCommit={(y, m) => onChange({ y }, m)} />
      </Row>
      {withSize && values.w !== undefined && values.h !== undefined && (
        <Row>
          <NumberField label={t("properties.width")} value={values.w} min={20} max={5000} unit="px" onCommit={(w, m) => onChange({ w }, m)} />
          <NumberField label={t("properties.height")} value={values.h} min={20} max={5000} unit="px" onCommit={(h, m) => onChange({ h }, m)} />
        </Row>
      )}
      <NumberField
        label={t("properties.rotation")}
        value={values.rotation}
        min={-360}
        max={360}
        unit="°"
        onCommit={(rotation, m) => onChange({ rotation }, m)}
      />
    </>
  );
}

// ---------------------------------------------------------------- panels

const BORDER_COLORS = [
  { value: "#000000", key: "sfx.colorBlack" },
  { value: "#FFFFFF", key: "sfx.colorWhite" },
  { value: "#71717A", key: "properties.colorGrey" },
] as const;

const PANEL_FILLS = [
  { value: "#FFFFFF", key: "properties.bgWhite" },
  { value: "#F1E2C4", key: "properties.fillSepia" },
  { value: "#D4D4D8", key: "properties.bgGrey" },
  { value: "#111111", key: "properties.bgBlack" },
  { value: "#1E2A4A", key: "properties.fillNight" },
  { value: "#B91C1C", key: "properties.fillRed" },
] as const;

function PanelProperties({ t, panels }: { t: T; panels: Panel[] }) {
  const single = panels.length === 1 ? panels[0] : null;
  const ids = panels.map((p) => p.id).join(",");
  return (
    <>
      <Section title={single ? t("properties.panel") : t("properties.panels", { count: panels.length })}>
        <Row>
          <NumberField
            label={t("properties.borderWidth")}
            value={common(panels, (p) => p.border.width) ?? panels[0].border.width}
            min={0}
            max={40}
            unit="px"
            onCommit={(width, m) => applyTo(panels, (p) => ({ border: { ...p.border, width } }), m ? `border:${ids}` : undefined)}
          />
        </Row>
        <ColorField
          label={t("properties.borderColor")}
          value={common(panels, (p) => p.border.color)}
          swatches={BORDER_COLORS.map((c) => ({ value: c.value, label: t(c.key) }))}
          customLabel={t("sfx.colorCustom")}
          onPick={(color, m) => applyTo(panels, (p) => ({ border: { ...p.border, color } }), m ? `borderColor:${ids}` : undefined)}
        />
        <ColorField
          label={t("properties.panelFill")}
          value={common(panels, (p) => p.fill ?? PANEL_FILL_DEFAULT)}
          swatches={PANEL_FILLS.map((c) => ({ value: c.value, label: t(c.key) }))}
          customLabel={t("sfx.colorCustom")}
          onPick={(fill, m) => applyTo(panels, { fill }, m ? `fill:${ids}` : undefined)}
        />
        <p className="text-xs text-zinc-500">{t("properties.panelFillHelp")}</p>
      </Section>
      {single && (
        <>
          <Section title={t("properties.image")}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openImagePicker(single.id)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {single.image ? t("properties.replaceImage") : t("properties.importImage")}
              </button>
              {single.image && (
                <>
                  <button
                    type="button"
                    onClick={() => useEditorStore.getState().startCrop(single.id)}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    {t("properties.crop")}
                  </button>
                  <button
                    type="button"
                    onClick={() => useEditorStore.getState().setPanelImage(single.id, null)}
                    className="rounded-md px-2.5 py-1 text-sm text-red-700 hover:bg-red-50"
                  >
                    {t("crop.remove")}
                  </button>
                </>
              )}
            </div>
          </Section>
          <Section title={t("properties.position")}>
            <GeometryFields
              t={t}
              values={single}
              onChange={(change, m) => applyTo([single], (p) => panelGeometryPatch(p, change), m ? `geo:${single.id}` : undefined)}
            />
          </Section>
          <Section title={t("properties.scene")}>
            <TextField
              label={t("properties.description")}
              placeholder={t("properties.descriptionPlaceholder")}
              multiline
              value={single.description ?? ""}
              onCommit={(description) => applyTo([single], { description })}
            />
          </Section>
        </>
      )}
    </>
  );
}

// --------------------------------------------------------------- bubbles

function NewBubble({ t }: { t: T }) {
  const type = useEditorStore((s) => s.newBubbleType);
  return (
    <Section title={t("properties.newBubble")}>
      <Segmented
        label={t("properties.bubbleType")}
        value={type}
        options={BUBBLE_TYPES.map((value) => ({ value, label: t(BUBBLE_TYPE_LABELS[value]), icon: <BubbleTypeIcon type={value} /> }))}
        onChange={(value) => useEditorStore.getState().setBubbleType([], value)}
      />
      <p className="text-sm text-zinc-600">{t("bubble.hintPlace")}</p>
    </Section>
  );
}

function BubbleProperties({ t, bubbles }: { t: T; bubbles: Bubble[] }) {
  const single = bubbles.length === 1 ? bubbles[0] : null;
  const ids = bubbles.map((b) => b.id);
  return (
    <>
      <Section title={single ? t("properties.bubble") : t("properties.bubbles", { count: bubbles.length })}>
        {single && (
          <TextField
            label={t("properties.text")}
            multiline
            value={single.text}
            onCommit={(text) => applyTo([single], { text })}
          />
        )}
        <Segmented
          label={t("properties.bubbleType")}
          value={common(bubbles, (b) => b.type)}
          options={BUBBLE_TYPES.map((value) => ({ value, label: t(BUBBLE_TYPE_LABELS[value]), icon: <BubbleTypeIcon type={value} /> }))}
          onChange={(value) => useEditorStore.getState().setBubbleType(ids, value)}
        />
        <Row>
          <NumberField
            label={t("properties.fontSize")}
            value={common(bubbles, (b) => b.fontSize) ?? bubbles[0].fontSize}
            min={8}
            max={160}
            unit="px"
            onCommit={(fontSize, m) => applyTo(bubbles, { fontSize }, m ? `font:${ids.join(",")}` : undefined)}
          />
        </Row>
        <Segmented
          label={t("properties.align")}
          value={common(bubbles, (b) => b.align)}
          iconsOnly
          options={(["left", "center", "right"] as const).map((value) => ({
            value,
            label: t(`properties.align${value[0].toUpperCase()}${value.slice(1)}` as MessageKey),
            icon: <AlignIcon align={value} />,
          }))}
          onChange={(align) => applyTo(bubbles, { align })}
        />
        <p className="text-xs text-zinc-500">{t("bubble.hintEdit")}</p>
      </Section>
      {single && (
        <Section title={t("properties.position")}>
          <GeometryFields
            t={t}
            values={single}
            onChange={(change, m) => applyTo([single], (b) => bubbleGeometryPatch(b, change), m ? `geo:${single.id}` : undefined)}
          />
        </Section>
      )}
    </>
  );
}

// ----------------------------------------------------------------- sfx

function SfxProperties({ t, sfx }: { t: T; sfx: Sfx[] }) {
  const single = sfx.length === 1 ? sfx[0] : null;
  const ids = sfx.map((x) => x.id).join(",");
  return (
    <>
      <Section title={single ? t("sfx.barTitle") : t("properties.sfxMany", { count: sfx.length })}>
        {single && (
          <TextField
            label={t("properties.text")}
            value={single.text}
            onCommit={(text) => {
              if (text.trim() === "") useEditorStore.getState().removeElement(single.id);
              else applyTo([single], { text });
            }}
          />
        )}
        <Row>
          <NumberField
            label={t("properties.fontSize")}
            value={common(sfx, (x) => x.fontSize) ?? sfx[0].fontSize}
            min={16}
            max={600}
            step={4}
            unit="px"
            onCommit={(size, m) => applyTo(sfx, { fontSize: clampSfxFontSize(size) }, m ? `font:${ids}` : undefined)}
          />
        </Row>
        <ColorField
          label={t("sfx.color")}
          value={common(sfx, (x) => x.color)}
          swatches={SFX_COLORS.map((c) => ({ value: c.value, label: t(c.key) }))}
          customLabel={t("sfx.colorCustom")}
          onPick={(color, m) => applyTo(sfx, { color }, m ? `sfxColor:${ids}` : undefined)}
        />
        <ColorField
          label={t("sfx.stroke")}
          value={common(sfx, (x) => x.strokeColor)}
          swatches={SFX_STROKES.map((c) => ({ value: c.value, label: t(c.key) }))}
          onPick={(strokeColor) => applyTo(sfx, { strokeColor })}
        />
        <p className="text-xs text-zinc-500">{t("sfx.hintEdit")}</p>
      </Section>
      {single && (
        <Section title={t("properties.position")}>
          <GeometryFields
            t={t}
            withSize={false}
            values={single}
            onChange={(change, m) => applyTo([single], (x) => sfxGeometryPatch(x, change), m ? `geo:${single.id}` : undefined)}
          />
        </Section>
      )}
    </>
  );
}
