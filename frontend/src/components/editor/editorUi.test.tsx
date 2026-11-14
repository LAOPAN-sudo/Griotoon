import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { TextEditor } from "./TextEditor";
import { PropertiesPanel } from "./sidebar/PropertiesPanel";
import { LayersPanel } from "./sidebar/LayersPanel";
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

  it("B selects the Bubble tool and the panel picks the type of the next bubble", () => {
    render(
      <>
        <EditorShortcuts />
        <PropertiesPanel />
      </>,
    );
    expect(screen.getByRole("region", { name: "Propriétés" })).toHaveTextContent("Page");
    fireEvent.keyDown(window, { key: "b" });
    expect(store().tool).toBe("bubble");
    expect(screen.getByRole("region", { name: "Propriétés" })).toHaveTextContent("Clique sur la page");
    fireEvent.click(screen.getByRole("button", { name: "Cri" }));
    expect(store().newBubbleType).toBe("shout");
    expect(screen.getByRole("button", { name: "Cri" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the type of the selected bubbles", () => {
    render(<PropertiesPanel />);
    act(() => {
      const a = store().addBubble({ type: "speech" });
      const b = store().addBubble({ type: "speech" });
      store().select([a, b]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Narration" }));
    expect(bubbles().map((b) => b.type)).toEqual(["narration", "narration"]);
    expect(bubbles()[0].tail).toBeUndefined();
  });

  it("shows only common actions when panels and bubbles are selected together", () => {
    render(<PropertiesPanel />);
    act(() => {
      store().select([store().addBubble(), store().addPanel()]);
    });
    expect(screen.getByRole("region", { name: "Propriétés" })).toHaveTextContent("2 éléments sélectionnés");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer (2)" }));
    expect(bubbles()).toHaveLength(0);
    expect(panels()).toHaveLength(0);
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

  it("O selects the tool and the panel explains how to place one", () => {
    render(
      <>
        <EditorShortcuts />
        <PropertiesPanel />
      </>,
    );
    fireEvent.keyDown(window, { key: "o" });
    expect(store().tool).toBe("sfx");
    expect(screen.getByRole("region", { name: "Propriétés" })).toHaveTextContent("Clique sur la page");
  });

  it("changes text and outline colours of the selection in one step each", () => {
    render(<PropertiesPanel />);
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

describe("properties panel", () => {
  const store = () => useEditorStore.getState();

  it("edits page settings when nothing is selected", () => {
    render(<PropertiesPanel />);
    const margin = screen.getByLabelText("Marge");
    fireEvent.focus(margin);
    fireEvent.change(margin, { target: { value: "80,5" } }); // French decimal comma
    fireEvent.keyDown(margin, { key: "Enter" });
    expect(store().page.margin).toBe(80.5);
    fireEvent.click(screen.getByRole("button", { name: "Crème" }));
    expect(store().page.background).toBe("#FFF8E7");
  });

  it("ignores invalid numbers and clamps to the limits", () => {
    render(<PropertiesPanel />);
    const gutter = screen.getByLabelText("Gouttière");
    fireEvent.focus(gutter);
    fireEvent.change(gutter, { target: { value: "abc" } });
    fireEvent.blur(gutter);
    expect(store().page.gutter).toBe(20);
    fireEvent.focus(gutter);
    fireEvent.change(gutter, { target: { value: "9999" } });
    fireEvent.blur(gutter);
    expect(store().page.gutter).toBe(200);
  });

  it("changes a panel border and its description", () => {
    render(<PropertiesPanel />);
    act(() => {
      store().select(store().addPanel());
    });
    const border = screen.getByLabelText("Bordure");
    fireEvent.focus(border);
    fireEvent.keyDown(border, { key: "ArrowUp" });
    fireEvent.keyDown(border, { key: "ArrowUp", shiftKey: true });
    expect(panels()[0].border.width).toBe(15);
    fireEvent.click(screen.getByRole("button", { name: "Gris" }));
    expect(panels()[0].border.color).toBe("#71717A");
    const description = screen.getByLabelText("Description de la case");
    fireEvent.focus(description);
    fireEvent.change(description, { target: { value: "Plan large du marché" } });
    fireEvent.blur(description);
    expect(panels()[0].description).toBe("Plan large du marché");
  });

  it("colours the inside of the selected panels", () => {
    render(<PropertiesPanel />);
    act(() => {
      const a = store().addPanel();
      const b = store().addPanel();
      store().select([a, b]);
    });
    const fill = screen.getByRole("group", { name: "Fond de la case" });
    expect(within(fill).getByRole("button", { name: "Blanc" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(fill).getByRole("button", { name: "Bleu nuit" }));
    expect(panels().map((p) => p.fill)).toEqual(["#1E2A4A", "#1E2A4A"]);
    expect(panels().map((p) => p.border.color)).toEqual(["#000000", "#000000"]);
    act(() => store().undo());
    expect(panels().map((p) => p.fill)).toEqual([undefined, undefined]);
  });

  it("merges arrow-key steps into one undo step", () => {
    render(<PropertiesPanel />);
    act(() => {
      store().select(store().addPanel());
    });
    const steps = store().past.length;
    const border = screen.getByLabelText("Bordure");
    for (let i = 0; i < 5; i++) fireEvent.keyDown(border, { key: "ArrowUp" });
    expect(panels()[0].border.width).toBe(9);
    expect(store().past.length).toBe(steps + 1);
  });

  it("edits a bubble: text, size, alignment and position (the tail follows)", () => {
    render(<PropertiesPanel />);
    act(() => {
      store().select(store().addBubble({ x: 100, y: 100, tail: { x: 200, y: 400 } }));
    });
    const text = screen.getByLabelText("Texte");
    fireEvent.focus(text);
    fireEvent.change(text, { target: { value: "Bonjour !" } });
    fireEvent.blur(text);
    const size = screen.getByLabelText("Taille du texte");
    fireEvent.focus(size);
    fireEvent.change(size, { target: { value: "36" } });
    fireEvent.blur(size);
    fireEvent.click(screen.getByRole("button", { name: "Aligner à gauche" }));
    const x = screen.getByLabelText("X");
    fireEvent.focus(x);
    fireEvent.change(x, { target: { value: "150" } });
    fireEvent.blur(x);
    expect(store().page.bubbles[0]).toMatchObject({
      text: "Bonjour !",
      fontSize: 36,
      align: "left",
      x: 150,
      tail: { x: 250, y: 400 },
    });
  });
});

describe("layers panel", () => {
  const store = () => useEditorStore.getState();

  it("lists texts above panels, top first, with readable names", () => {
    act(() => {
      store().addPanel();
      store().addPanel();
      store().addBubble({ text: "Vite, le marché ouvre déjà !" });
      store().addSfx({ text: "BAM !" });
    });
    render(<LayersPanel />);
    const texts = screen.getByRole("list", { name: /Bulles et onomatopées/ });
    const panelList = screen.getByRole("list", { name: "Cases" });
    expect(texts).toHaveTextContent(/BAM !.*Vite, le marché ouvre d…/);
    expect(panelList).toHaveTextContent(/Case 2.*Case 1/);
  });

  it("selects on click, adds with Shift, hides with the eye and deletes with the bin", () => {
    let a = "";
    let b = "";
    act(() => {
      a = store().addPanel();
      b = store().addPanel();
    });
    render(<LayersPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Case 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Case 2" }), { shiftKey: true });
    expect(store().selectedIds).toEqual([a, b]);

    fireEvent.click(screen.getByRole("button", { name: "Masquer « Case 1 »" }));
    expect(panels()[0].hidden).toBe(true);
    expect(store().selectedIds).toEqual([b]);
    expect(screen.getByRole("button", { name: "Afficher « Case 1 »" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer « Case 2 »" }));
    expect(panels().map((p) => p.id)).toEqual([a]);
  });

  it("reorders with Alt + arrows and by drag and drop", () => {
    let a = "";
    let b = "";
    let c = "";
    act(() => {
      a = store().addPanel(); // z 0
      b = store().addPanel(); // z 1
      c = store().addPanel(); // z 2 (top)
    });
    render(<LayersPanel />);
    const order = () => [...panels()].sort((x, y) => y.z - x.z).map((p) => p.id);
    expect(order()).toEqual([c, b, a]);

    fireEvent.keyDown(screen.getByRole("button", { name: "Case 1" }), { key: "ArrowUp", altKey: true });
    expect(order()).toEqual([c, a, b]);

    // Drag "Case 3" (top) and drop it at the bottom of the list.
    const rows = screen.getByRole("list", { name: "Cases" }).querySelectorAll("li");
    const dataTransfer = { setData: () => {}, effectAllowed: "" };
    fireEvent.dragStart(rows[0], { dataTransfer });
    rows[2].getBoundingClientRect = () => ({ top: 0, height: 20 }) as DOMRect;
    fireEvent.dragOver(rows[2], { clientY: 15, dataTransfer });
    fireEvent.drop(rows[2], { dataTransfer });
    expect(order()).toEqual([a, b, c]);
  });
});
