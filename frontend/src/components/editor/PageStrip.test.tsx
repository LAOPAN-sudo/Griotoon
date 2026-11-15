import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ChapterOverview } from "./ChapterOverview";
import { PageStrip } from "./PageStrip";

// No canvas in the test DOM: thumbnails are not drawn.
vi.mock("./renderPage", () => ({ renderPageCanvas: () => Promise.reject(new Error("no canvas")) }));

const store = () => useEditorStore.getState();
const bar = () => screen.getByRole("navigation", { name: "Pages du chapitre" });
const thumbs = () => within(bar()).getAllByRole("button", { name: /^(Couverture|Page \d+)$/ });

describe("page bar", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "fr" });
    useUiStore.setState({ overviewOpen: false });
    store().loadPage(createEmptyPage());
  });

  it("shows the cover first, then the pages, and the position", () => {
    render(<PageStrip />);
    expect(thumbs().map((b) => b.getAttribute("aria-label"))).toEqual(["Couverture", "Page 1"]);
    expect(within(bar()).getByText("Page 1 / 1")).toBeInTheDocument();
    fireEvent.click(within(bar()).getByRole("button", { name: "Couverture" }));
    expect(store().currentPage).toBe(0);
    expect(within(bar()).getByText("Couverture · 1 p.")).toBeInTheDocument();
  });

  it("adds pages and marks the one being edited", () => {
    render(<PageStrip />);
    fireEvent.click(within(bar()).getByRole("button", { name: "Page" }));
    expect(thumbs()).toHaveLength(3);
    expect(within(bar()).getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(within(bar()).getByText("Page 2 / 2")).toBeInTheDocument();
  });

  it("offers neither copy nor delete for the cover", () => {
    render(<PageStrip />);
    expect(within(bar()).getAllByRole("button", { name: /^Dupliquer/ })).toHaveLength(1);
    fireEvent.click(within(bar()).getByRole("button", { name: "Dupliquer la page 1" }));
    expect(store().pages).toHaveLength(3);
  });

  it("asks before deleting a page, and never offers to delete the last one", () => {
    render(<PageStrip />);
    expect(within(bar()).queryByRole("button", { name: /^Supprimer la page/ })).toBeNull();
    fireEvent.click(within(bar()).getByRole("button", { name: "Page" }));
    fireEvent.click(within(bar()).getByRole("button", { name: "Supprimer la page 1" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Supprimer la page 1 ?");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(store().pages).toHaveLength(3);
    fireEvent.click(within(bar()).getByRole("button", { name: "Supprimer la page 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la page" }));
    expect(store().pages).toHaveLength(2);
  });

  it("moves a page with Alt + arrows, never before the cover", () => {
    store().addPage();
    const [cover, first, second] = store().pages.map((p) => p.id);
    render(<PageStrip />);
    fireEvent.keyDown(within(bar()).getByRole("button", { name: "Page 2" }), { key: "ArrowLeft", altKey: true });
    expect(store().pages.map((p) => p.id)).toEqual([cover, second, first]);
    fireEvent.keyDown(within(bar()).getByRole("button", { name: "Page 1" }), { key: "ArrowLeft", altKey: true });
    expect(store().pages[0].id).toBe(cover);
  });

  it("edits the chapter number and title in place", () => {
    render(<PageStrip />);
    const title = within(bar()).getByLabelText("Titre du chapitre");
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "La route de Ouaga" } });
    fireEvent.keyDown(title, { key: "Enter" });
    const number = within(bar()).getByLabelText("Numéro du chapitre");
    fireEvent.focus(number);
    fireEvent.change(number, { target: { value: "abc" } });
    fireEvent.blur(number);
    expect(store().chapterNumber).toBe(1);
    fireEvent.focus(number);
    fireEvent.change(number, { target: { value: "3" } });
    fireEvent.blur(number);
    expect(store().getChapter()).toMatchObject({ number: 3, title: "La route de Ouaga" });
  });
});

describe("chapter overview", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "fr" });
    useUiStore.setState({ overviewOpen: false });
    store().loadPage(createEmptyPage());
    store().addPage();
    store().addPage(); // cover, 1, 2, 3
  });

  it("opens from the bar and shows the pages two by two after the cover", () => {
    render(
      <>
        <PageStrip />
        <ChapterOverview />
      </>,
    );
    fireEvent.click(within(bar()).getByRole("button", { name: "Vue d'ensemble" }));
    const dialog = screen.getByRole("dialog", { name: "Vue d'ensemble du chapitre" });
    expect(within(dialog).getByRole("list", { name: "Couverture" })).toBeInTheDocument();
    expect(within(dialog).getByRole("list", { name: "Page 1 – Page 2" })).toBeInTheDocument();
    expect(within(dialog).getByRole("list", { name: "Page 3" })).toBeInTheDocument();
    expect(within(dialog).getByText("Couverture + 3 p.")).toBeInTheDocument();
  });

  it("opens a page on click and closes", () => {
    act(() => useUiStore.getState().setOverviewOpen(true));
    render(<ChapterOverview />);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Page 1" }));
    expect(store().currentPage).toBe(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape, but not while a delete is being confirmed", () => {
    act(() => useUiStore.getState().setOverviewOpen(true));
    render(<ChapterOverview />);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la page 2" }));
    expect(screen.getByRole("dialog", { name: /Supprimer la page 2/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().overviewOpen).toBe(false);
  });
});
