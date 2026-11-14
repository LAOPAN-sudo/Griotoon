"use client";

import { useT } from "@/i18n";
import { useUiStore } from "@/store/uiStore";
import { SidebarIcon } from "../icons";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";

/** Right column: properties of the selection (top) and layers (bottom). */
export function Sidebar() {
  const t = useT();
  const open = useUiStore((s) => s.sidebarOpen);
  if (!open) return null;
  return (
    <aside
      aria-label={t("sidebar.label")}
      className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white"
    >
      <div className="max-h-[60%] shrink-0 overflow-y-auto border-b border-zinc-200">
        <PropertiesPanel />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <LayersPanel />
      </div>
    </aside>
  );
}

/** Header button showing / hiding the right column (more room for the page on small screens). */
export function SidebarToggle() {
  const t = useT();
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  return (
    <button
      type="button"
      aria-pressed={open}
      title={open ? t("sidebar.hide") : t("sidebar.show")}
      aria-label={open ? t("sidebar.hide") : t("sidebar.show")}
      onClick={() => setOpen(!open)}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${open ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"}`}
    >
      <SidebarIcon />
    </button>
  );
}
