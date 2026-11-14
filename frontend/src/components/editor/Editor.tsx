"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useT } from "@/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { EditorShortcuts } from "./EditorShortcuts";
import { HistoryControls } from "./HistoryControls";
import { ShortcutsButton, ShortcutsDialog } from "./ShortcutsDialog";
import { CropBar } from "./CropBar";
import { Sidebar, SidebarToggle } from "./sidebar/Sidebar";
import { ImagePicker } from "./ImagePicker";
import { Toast } from "@/components/ui/Toast";
import { Toolbar } from "./Toolbar";
import { ZoomControls } from "./ZoomControls";
import { SaveIndicator } from "./SaveIndicator";
import { useLocalSave } from "./useLocalSave";

function CanvasLoading() {
  const t = useT();
  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
      {t("editor.loading")}
    </div>
  );
}

// Konva needs the browser canvas: never render it on the server.
const EditorCanvas = dynamic(() => import("./EditorCanvas"), {
  ssr: false,
  loading: CanvasLoading,
});

export function Editor() {
  const t = useT();
  // The canvas waits for the last saved page to be restored.
  const ready = useLocalSave();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <EditorShortcuts />
      <ShortcutsDialog />
      <ImagePicker />
      <Toast />
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-bangers text-xl tracking-wide text-zinc-900"
            title={t("editor.backHome")}
          >
            {t("app.name")}
          </Link>
          <span className="text-sm text-zinc-500">{t("editor.title")}</span>
          <HistoryControls />
          <SaveIndicator />
        </div>
        <div className="flex items-center gap-4">
          <ZoomControls />
          <ShortcutsButton />
          <LanguageSwitcher />
          <SidebarToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Toolbar />
        <main className="relative flex-1 bg-zinc-200">
          {ready ? <EditorCanvas /> : <CanvasLoading />}
          <CropBar />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
