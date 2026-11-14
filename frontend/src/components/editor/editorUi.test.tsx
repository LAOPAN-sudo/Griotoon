import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEditorStore } from "@/store/editorStore";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { TemplatePicker } from "./TemplatePicker";
import { HistoryControls } from "./HistoryControls";

const panels = () => useEditorStore.getState().page.panels;

beforeEach(() => {
  useLocaleStore.setState({ locale: "fr" });
  useEditorStore.getState().loadPage(createEmptyPage());
});

describe("TemplatePicker", () => {
  it("applies a template directly on an empty page", () => {
    const onDone = vi.fn();
    render(<TemplatePicker onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Grille 2 × 2" }));
    expect(panels()).toHaveLength(4);
    expect(onDone).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before replacing existing panels, and replaces on confirm", () => {
    useEditorStore.getState().addPanel();
    render(<TemplatePicker onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Action" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Remplacer les cases actuelles ?");
    expect(panels()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Remplacer" }));
    expect(panels()).toHaveLength(5);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the current panels when the user cancels", () => {
    useEditorStore.getState().addPanel();
    render(<TemplatePicker onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Pleine page" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(panels()).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows template names in English", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<TemplatePicker onDone={() => {}} />);
    expect(screen.getByRole("button", { name: "Full page" })).toBeInTheDocument();
  });
});

describe("HistoryControls", () => {
  it("undoes and redoes with the buttons and keyboard shortcuts", () => {
    render(<HistoryControls />);
    const undo = screen.getByRole("button", { name: /Annuler/ });
    const redo = screen.getByRole("button", { name: /Rétablir/ });
    expect(undo).toBeDisabled();

    useEditorStore.getState().addPanel();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(panels()).toHaveLength(0);
    expect(redo).toBeEnabled();

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(panels()).toHaveLength(1);

    fireEvent.click(undo);
    expect(panels()).toHaveLength(0);
    fireEvent.keyDown(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(panels()).toHaveLength(1);
  });
});
