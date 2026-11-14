"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import { layerGroups, moveLayer, type LayerItem } from "@/lib/layers";
import { layerText } from "@/lib/properties";
import { useEditorStore } from "@/store/editorStore";
import { BubbleTypeIcon, EyeIcon, GripIcon, PanelIcon, SfxIcon, TrashIcon } from "../icons";

type T = ReturnType<typeof useT>;

function label(t: T, item: LayerItem, panelNumber: number): string {
  switch (item.kind) {
    case "panel":
      return t("layers.panel", { n: panelNumber });
    case "bubble":
      return item.el.text.trim() ? layerText(item.el.text) : t("layers.emptyBubble");
    case "sfx":
      return layerText(item.el.text);
  }
}

/** All the elements of the page, in two groups, top first. */
export function LayersPanel() {
  const t = useT();
  const page = useEditorStore((s) => s.page);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const groups = layerGroups(page);
  // Panels are named by creation order ("Case 1", "Case 2"…), which does not change when reordering.
  const panelNumbers = new Map(page.panels.map((p, i) => [p.id, i + 1]));

  return (
    <div role="region" aria-label={t("layers.title")} className="flex flex-col">
      <h3 className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("layers.title")}</h3>
      <LayerGroup
        t={t}
        title={t("layers.texts")}
        items={groups.texts}
        selectedIds={selectedIds}
        panelNumbers={panelNumbers}
      />
      <LayerGroup
        t={t}
        title={t("layers.panels")}
        items={groups.panels}
        selectedIds={selectedIds}
        panelNumbers={panelNumbers}
      />
    </div>
  );
}

interface LayerGroupProps {
  t: T;
  title: string;
  items: LayerItem[];
  selectedIds: string[];
  panelNumbers: Map<string, number>;
}

function LayerGroup({ t, title, items, selectedIds, panelNumbers }: LayerGroupProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  /** Insertion point while dragging: the row index the item would go before (items.length = at the end). */
  const [dropAt, setDropAt] = useState<number | null>(null);
  const ids = items.map((i) => i.el.id);

  const move = (id: string, index: number) => useEditorStore.getState().reorder(moveLayer(ids, id, index));

  const finishDrop = () => {
    if (dragging !== null && dropAt !== null) {
      const from = ids.indexOf(dragging);
      // Index in the list once the dragged row is taken out.
      move(dragging, dropAt > from ? dropAt - 1 : dropAt);
    }
    setDragging(null);
    setDropAt(null);
  };

  return (
    <div className="px-2 pb-2 pt-2">
      <h4 className="px-2 pb-1 text-[11px] font-medium text-zinc-400">{title}</h4>
      {items.length === 0 ? (
        <p className="px-2 py-1 text-xs italic text-zinc-400">{t("layers.empty")}</p>
      ) : (
        <ul
          aria-label={title}
          onDragOver={(e) => dragging && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            finishDrop();
          }}
        >
          {items.map((item, index) => {
            const { el } = item;
            const selected = selectedIds.includes(el.id);
            const name = label(t, item, panelNumbers.get(el.id) ?? 0);
            return (
              <li
                key={el.id}
                draggable
                onDragStart={(e) => {
                  setDragging(el.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", el.id); // required by Firefox
                }}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropAt(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDropAt(null);
                }}
                className={`group relative flex items-center gap-1 rounded-md pr-1 text-sm ${
                  selected ? "bg-blue-50 text-blue-900" : "text-zinc-700 hover:bg-zinc-100"
                } ${dragging === el.id ? "opacity-40" : ""}`}
              >
                {dropAt === index && <span className="absolute inset-x-1 -top-px h-0.5 rounded bg-blue-500" />}
                {dropAt === items.length && index === items.length - 1 && (
                  <span className="absolute inset-x-1 -bottom-px h-0.5 rounded bg-blue-500" />
                )}
                <span className="cursor-grab px-1 text-zinc-400" aria-hidden="true">
                  <GripIcon />
                </span>
                <button
                  type="button"
                  aria-pressed={selected}
                  title={t("layers.rowHelp")}
                  onClick={(e) => useEditorStore.getState().select(el.id, e.shiftKey)}
                  onKeyDown={(e) => {
                    // Alt + arrows: move the layer up / down in its group.
                    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                    e.preventDefault();
                    move(el.id, index + (e.key === "ArrowUp" ? -1 : 1));
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left ${el.hidden ? "text-zinc-400 line-through" : ""}`}
                >
                  <span className="shrink-0">
                    {item.kind === "panel" ? <PanelIcon /> : item.kind === "sfx" ? <SfxIcon /> : <BubbleTypeIcon type={item.el.type} />}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
                <button
                  type="button"
                  aria-label={t(el.hidden ? "layers.show" : "layers.hide", { name })}
                  title={t(el.hidden ? "layers.showShort" : "layers.hideShort")}
                  aria-pressed={!!el.hidden}
                  onClick={() => useEditorStore.getState().setHidden([el.id], !el.hidden)}
                  className={`rounded p-1 hover:bg-zinc-200 ${el.hidden ? "text-zinc-500" : "text-zinc-400 opacity-60 group-hover:opacity-100"}`}
                >
                  <EyeIcon off={el.hidden} />
                </button>
                <button
                  type="button"
                  aria-label={t("layers.delete", { name })}
                  title={t("layers.deleteShort")}
                  onClick={() => useEditorStore.getState().removeElement(el.id)}
                  className="rounded p-1 text-zinc-400 opacity-60 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                >
                  <TrashIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
