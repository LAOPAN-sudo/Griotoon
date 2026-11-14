import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ExportMenu } from "./ExportMenu";

const exportPage = vi.fn();
vi.mock("./exportCanvas", () => ({ exportPage: (...args: unknown[]) => exportPage(...args) }));

describe("export menu", () => {
  beforeEach(() => {
    exportPage.mockReset().mockResolvedValue(undefined);
    useLocaleStore.setState({ locale: "fr" });
    useEditorStore.getState().loadPage(createEmptyPage());
    useUiStore.setState({ notice: null });
  });

  it("offers PNG and PDF and exports the current page", async () => {
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    expect(screen.getByRole("menu", { name: "Exporter la planche" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Document PDF/ }));
    await waitFor(() => expect(exportPage).toHaveBeenCalledTimes(1));
    expect(exportPage).toHaveBeenCalledWith(useEditorStore.getState().page, "pdf", "planche");
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(useUiStore.getState().notice).toBeNull());
  });

  it("closes the text editor before exporting", async () => {
    const id = useEditorStore.getState().addBubble();
    useEditorStore.getState().startEditing(id);
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Image PNG/ }));
    await waitFor(() => expect(exportPage).toHaveBeenCalled());
    expect(useEditorStore.getState().editingId).toBeNull();
  });

  it("shows an error when the export fails", async () => {
    exportPage.mockRejectedValue(new Error("boom"));
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
