import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ExportMenu } from "./ExportMenu";

const exportPagePng = vi.fn();
const exportChapterPdf = vi.fn();
vi.mock("./exportCanvas", () => ({
  exportPagePng: (...args: unknown[]) => exportPagePng(...args),
  exportChapterPdf: (...args: unknown[]) => exportChapterPdf(...args),
}));

describe("export menu", () => {
  beforeEach(() => {
    exportPagePng.mockReset().mockResolvedValue(undefined);
    exportChapterPdf.mockReset().mockResolvedValue(undefined);
    useLocaleStore.setState({ locale: "fr" });
    useEditorStore.getState().loadPage(createEmptyPage());
    useUiStore.setState({ notice: null });
  });

  it("exports the whole chapter as PDF", async () => {
    useEditorStore.getState().addPage();
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    expect(screen.getByRole("menu", { name: "Exporter la planche" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Document PDF.*Tout le chapitre \(2 p\.\)/ }));
    await waitFor(() => expect(exportChapterPdf).toHaveBeenCalledTimes(1));
    expect(exportChapterPdf).toHaveBeenCalledWith(useEditorStore.getState().pages, "planche", expect.any(Function));
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(useUiStore.getState().notice).toBeNull());
  });

  it("closes the text editor before exporting", async () => {
    const id = useEditorStore.getState().addBubble();
    useEditorStore.getState().startEditing(id);
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Image PNG/ }));
    await waitFor(() => expect(exportPagePng).toHaveBeenCalledWith(useEditorStore.getState().page, "planche"));
    expect(useEditorStore.getState().editingId).toBeNull();
  });

  it("shows an error when the export fails", async () => {
    exportPagePng.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Image PNG/ }));
    await waitFor(() => expect(useUiStore.getState().notice?.messageKey).toBe("export.error"));
  });

  it("closes with Escape", () => {
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
