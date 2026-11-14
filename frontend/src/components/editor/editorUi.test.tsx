import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEditorStore } from "@/store/editorStore";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { TemplatePicker } from "./TemplatePicker";
import { HistoryControls } from "./HistoryControls";
import { EditorShortcuts } from "./EditorShortcuts";
import { ShortcutsButton, ShortcutsDialog } from "./ShortcutsDialog";
import { useUiStore } from "@/store/uiStore";

const panels = () => useEditorStore.getState().page.panels;

beforeEach(() => {
  useLocaleStore.setState({ locale: "fr" });
  useEditorStore.getState().loadPage(createEmptyPage());
  useEditorStore.getState().setTool("select");
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

describe("HistoryControls + EditorShortcuts", () => {
  it("undoes and redoes with the buttons and keyboard shortcuts", () => {
    render(
      <>
        <EditorShortcuts />
        <HistoryControls />
      </>,
    );
    const undo = screen.getByRole("button", { name: /Annuler/ });
    const redo = screen.getByRole("button", { name: /Rétablir/ });
    expect(undo).toBeDisabled();

    act(() => {
      useEditorStore.getState().addPanel();
    });
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

describe("EditorShortcuts", () => {
  const store = () => useEditorStore.getState();

  it("deletes, duplicates and nudges the selection", () => {
    render(<EditorShortcuts />);
    const id = store().addPanel({ x: 100, y: 100 });
    store().select(id);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });
    expect(panels()[0]).toMatchObject({ x: 101, y: 110 });

    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(panels()).toHaveLength(2);
    expect(store().selectedIds).toEqual([panels()[1].id]);

    fireEvent.keyDown(window, { key: "Delete" });
    expect(panels()).toHaveLength(1);
    expect(store().selectedIds).toEqual([]);
  });

  it("does nothing without a selection", () => {
    render(<EditorShortcuts />);
    store().addPanel({ x: 100 });
    fireEvent.keyDown(window, { key: "Delete" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(panels()).toHaveLength(1);
    expect(panels()[0].x).toBe(100);
  });

  it("switches tools and leaves them with Escape", () => {
    render(<EditorShortcuts />);
    const id = store().addPanel();
    store().select(id);
    fireEvent.keyDown(window, { key: "c" });
    expect(store().tool).toBe("panel");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(store().tool).toBe("select");
    expect(store().selectedIds).toEqual([id]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(store().selectedIds).toEqual([]);
  });

  it("ignores keys typed in a text field", () => {
    render(
      <>
        <EditorShortcuts />
        <input aria-label="champ" />
      </>,
    );
    const id = store().addPanel();
    store().select(id);
    fireEvent.keyDown(screen.getByLabelText("champ"), { key: "Delete" });
    fireEvent.keyDown(screen.getByLabelText("champ"), { key: "c" });
    expect(panels()).toHaveLength(1);
    expect(store().tool).toBe("select");
  });
});

describe("ShortcutsDialog", () => {
  beforeEach(() => {
    useUiStore.setState({ shortcutsOpen: false });
  });

  it("opens with ?, lists the shortcuts and closes with Escape", () => {
    render(
      <>
        <EditorShortcuts />
        <ShortcutsDialog />
      </>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "?", shiftKey: true });
    const dialog = screen.getByRole("dialog", { name: "Raccourcis clavier" });
    expect(dialog).toHaveTextContent("Dupliquer la sélection");
    expect(dialog).toHaveTextContent("Maj");

    // Editor shortcuts are disabled while the dialog is open.
    useEditorStore.getState().select(useEditorStore.getState().addPanel());
    fireEvent.keyDown(window, { key: "Delete" });
    expect(panels()).toHaveLength(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from the header button and closes with the close button", () => {
    render(
      <>
        <ShortcutsButton />
        <ShortcutsDialog />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Raccourcis/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is translated in English, key names included", () => {
    useLocaleStore.setState({ locale: "en" });
    useUiStore.setState({ shortcutsOpen: true });
    render(<ShortcutsDialog />);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toHaveTextContent("Duplicate the selection");
    expect(dialog).toHaveTextContent("Shift");
    expect(dialog).not.toHaveTextContent("Maj");
  });
});
