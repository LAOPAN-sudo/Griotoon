import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createEmptyPage } from "@/lib/page";
import { memoryPageStorage, type PageStorage, type SavedPage } from "@/lib/pageStorage";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useLocaleStore } from "@/i18n";
import { SaveIndicator } from "./SaveIndicator";
import { useLocalSave } from "./useLocalSave";

function Harness({ storage }: { storage: PageStorage }) {
  const ready = useLocalSave(storage);
  return (
    <>
      <SaveIndicator />
      <p>{ready ? "ready" : "loading"}</p>
    </>
  );
}

const store = () => useEditorStore.getState();

describe("local save", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useLocaleStore.setState({ locale: "fr" });
    useEditorStore.getState().loadPage(createEmptyPage());
    useUiStore.setState({ saveStatus: "idle", lastSavedAt: null, notice: null });
  });
  afterEach(() => vi.useRealTimers());

  it("restores the saved page before showing the editor", async () => {
    const page = { ...createEmptyPage(), background: "#FFF8E7" };
    const storage = memoryPageStorage({ version: 1, savedAt: Date.now(), page });
    render(<Harness storage={storage} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(store().page.background).toBe("#FFF8E7");
    expect(store().past).toEqual([]); // restoring is not an undoable step
    expect(screen.getByRole("status")).toHaveTextContent("Enregistré ✓");
  });

  it("starts on an empty page when the save is unreadable", async () => {
    render(<Harness storage={memoryPageStorage({ broken: true })} />);
    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(store().page.panels).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("saves each change after a 1 s pause and shows the progress", async () => {
    const storage = memoryPageStorage();
    render(<Harness storage={storage} />);
    await screen.findByText("ready");
    act(() => {
      store().addPanel();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Enregistrement…");
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect((storage.data as SavedPage).chapter.pages[0].panels).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Enregistré ✓");
  });

  it("saves immediately when the tab is hidden", async () => {
    const storage = memoryPageStorage();
    render(<Harness storage={storage} />);
    await screen.findByText("ready");
    act(() => {
      store().updatePage({ margin: 90 });
    });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect((storage.data as SavedPage).chapter.pages[0].margin).toBe(90);
  });

  it("tells the user when the browser storage is full", async () => {
    const storage = memoryPageStorage();
    storage.save = vi.fn().mockRejectedValue(new DOMException("full", "QuotaExceededError"));
    render(<Harness storage={storage} />);
    await screen.findByText("ready");
    act(() => {
      store().addPanel();
    });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole("status")).toHaveTextContent("Non enregistré");
    expect(useUiStore.getState().notice?.messageKey).toBe("save.errorQuota");
  });
});
