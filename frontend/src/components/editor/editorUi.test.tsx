import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEditorStore } from "@/store/editorStore";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { TemplatePicker } from "./TemplatePicker";
import { HistoryControls } from "./HistoryControls";
import { EditorShortcuts } from "./EditorShortcuts";
import { ShortcutsButton, ShortcutsDialog } from "./ShortcutsDialog";
import { useUiStore } from "@/store/uiStore";
import { Toolbar } from "./Toolbar";
import { CropBar } from "./CropBar";
import { BubbleBar } from "./BubbleBar";
import { TextEditor } from "./TextEditor";
import { SfxBar } from "./SfxBar";
import { Toast } from "@/components/ui/Toast";
import { importImageIntoPanel } from "./imageImport";

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

describe("images", () => {
  const image = { src: "data:image/webp;base64,AAAA", width: 800, height: 600, offsetX: 0, offsetY: 0, scale: 1 };
  const store = () => useEditorStore.getState();

  beforeEach(() => {
    useUiStore.setState({ notice: null });
  });

  it("enables the Image button only when one panel is selected", () => {
    render(<Toolbar />);
    const button = screen.getByRole("button", { name: "Image" });
    expect(button).toBeDisabled();
    act(() => {
      store().select(store().addPanel());
    });
    expect(button).toBeEnabled();
    act(() => {
      store().select([store().addPanel(), store().addPanel()]);
    });
    expect(button).toBeDisabled();
  });

  it("refuses a file that is not an image, with a translated message", async () => {
    render(<Toast />);
    const id = store().addPanel();
    const pdf = new File(["%PDF"], "histoire.pdf", { type: "application/pdf" });
    let ok = true;
    await act(async () => {
      ok = await importImageIntoPanel(pdf, id);
    });
    expect(ok).toBe(false);
    expect(screen.getByRole("alert")).toHaveTextContent("n'est pas une image");
    expect(panels()[0].image).toBeNull();
  });

  it("shows the crop bar, ends the session with Escape and can remove the image", () => {
    render(
      <>
        <EditorShortcuts />
        <CropBar />
      </>,
    );
    const id = store().addPanel({ w: 400, h: 300 });
    act(() => {
      store().setPanelImage(id, image);
      store().startCrop(id);
    });
    expect(screen.getByRole("toolbar", { name: "Recadrage" })).toBeInTheDocument();

    // Delete must not remove the panel while cropping.
    fireEvent.keyDown(window, { key: "Delete" });
    expect(panels()).toHaveLength(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(store().crop).toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();

    act(() => {
      store().startCrop(id);
    });
    fireEvent.click(screen.getByRole("button", { name: "Retirer l'image" }));
    expect(panels()[0].image).toBeNull();
    expect(store().crop).toBeNull();
  });

  it("zooms the image with the crop slider, keeping it inside the panel", () => {
    render(<CropBar />);
    const id = store().addPanel({ w: 400, h: 300 });
    act(() => {
      store().setPanelImage(id, { ...image, scale: 0.5, offsetX: 0, offsetY: 0 });
      store().startCrop(id);
    });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    const cropped = store().crop!.image;
    expect(cropped.scale).toBeCloseTo(1);
    expect(cropped.offsetX).toBeLessThanOrEqual(0);
    expect(cropped.offsetX + cropped.width * cropped.scale).toBeGreaterThanOrEqual(400);
  });
});

describe("bubbles UI", () => {
  const store = () => useEditorStore.getState();
  const bubbles = () => store().page.bubbles;

  it("B selects the Bubble tool and the bar picks the type of the next bubble", () => {
    render(
      <>
        <EditorShortcuts />
        <BubbleBar />
      </>,
    );
    expect(screen.queryByRole("toolbar", { name: "Bulles" })).toBeNull();
    fireEvent.keyDown(window, { key: "b" });
    expect(store().tool).toBe("bubble");
    const bar = screen.getByRole("toolbar", { name: "Bulles" });
    expect(bar).toHaveTextContent("Clique sur la page");
    fireEvent.click(screen.getByRole("button", { name: "Cri" }));
    expect(store().newBubbleType).toBe("shout");
    expect(screen.getByRole("button", { name: "Cri" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the type of the selected bubbles", () => {
    render(<BubbleBar />);
    act(() => {
      const a = store().addBubble({ type: "speech" });
      const b = store().addBubble({ type: "speech" });
      store().select([a, b]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Narration" }));
    expect(bubbles().map((b) => b.type)).toEqual(["narration", "narration"]);
    expect(bubbles()[0].tail).toBeUndefined();
  });

  it("hides the bar when the selection is not only bubbles", () => {
    render(<BubbleBar />);
    act(() => {
      store().select([store().addBubble(), store().addPanel()]);
    });
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("edits the text in a field over the bubble and saves it on Escape", async () => {
    render(<TextEditor />);
    act(() => {
      store().startEditing(store().addBubble({ text: "Salut" }));
    });
    const field = screen.getByRole("textbox", { name: "Texte de la bulle" });
    expect(field).toHaveValue("Salut");
    await waitFor(() => expect(field).toHaveFocus()); // focus is deferred by one tick
    fireEvent.change(field, { target: { value: "Vite, le marché ouvre déjà !" } });
    // Still a draft: not saved before the field closes.
    expect(bubbles()[0].text).toBe("Salut");
    fireEvent.keyDown(field, { key: "Escape" });
    expect(bubbles()[0].text).toBe("Vite, le marché ouvre déjà !");
    expect(store().editingId).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    // One undo step for the text.
    act(() => store().undo());
    expect(bubbles()[0].text).toBe("Salut");
  });

  it("saves on blur and adds no step when the text did not change", () => {
    render(<TextEditor />);
    act(() => {
      store().startEditing(store().addBubble({ text: "Bonjour" }));
    });
    const steps = store().past.length;
    fireEvent.blur(screen.getByRole("textbox"));
    expect(store().editingId).toBeNull();
    expect(store().past.length).toBe(steps);
  });

  it("does not delete the bubble when Delete is typed in its text", () => {
    render(
      <>
        <EditorShortcuts />
        <TextEditor />
      </>,
    );
    act(() => {
      store().startEditing(store().addBubble());
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Delete" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "b" });
    expect(bubbles()).toHaveLength(1);
    expect(store().tool).toBe("select");
  });
});

describe("sound effects UI", () => {
  const store = () => useEditorStore.getState();
  const sfx = () => store().page.sfx;

  it("O selects the tool and the bar explains how to place one", () => {
    render(
      <>
        <EditorShortcuts />
        <SfxBar />
      </>,
    );
    fireEvent.keyDown(window, { key: "o" });
    expect(store().tool).toBe("sfx");
    expect(screen.getByRole("toolbar", { name: "Onomatopée" })).toHaveTextContent("Clique sur la page");
  });

  it("changes text and outline colours of the selection in one step each", () => {
    render(<SfxBar />);
    act(() => {
      store().select([store().addSfx(), store().addSfx()]);
    });
    const steps = store().past.length;
    fireEvent.click(screen.getByRole("button", { name: "Jaune" }));
    fireEvent.click(screen.getByRole("button", { name: "Contour blanc" }));
    expect(sfx().map((x) => [x.color, x.strokeColor])).toEqual([
      ["#F1C40F", "#FFFFFF"],
      ["#F1C40F", "#FFFFFF"],
    ]);
    expect(screen.getByRole("button", { name: "Jaune" })).toHaveAttribute("aria-pressed", "true");
    expect(store().past.length).toBe(steps + 2);
  });

  it("selects the default text so typing replaces it, Enter saves", async () => {
    render(<TextEditor />);
    act(() => {
      store().startEditing(store().addSfx());
    });
    const field = screen.getByRole("textbox", { name: "Texte de l'onomatopée" }) as HTMLTextAreaElement;
    await waitFor(() => expect(field).toHaveFocus());
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, "BAM !".length]);
    fireEvent.change(field, { target: { value: "VLAN !" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(sfx()[0].text).toBe("VLAN !");
    expect(store().editingId).toBeNull();
  });

  it("removes a sound effect whose text was emptied", () => {
    render(<TextEditor />);
    act(() => {
      store().startEditing(store().addSfx());
    });
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(sfx()).toHaveLength(0);
    expect(store().selectedIds).toEqual([]);
  });

  it("keeps a new line with Shift + Enter", () => {
    render(<TextEditor />);
    act(() => {
      store().startEditing(store().addSfx());
    });
    const field = screen.getByRole("textbox");
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(store().editingId).not.toBeNull();
  });
});
