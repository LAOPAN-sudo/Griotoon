import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useLocaleStore } from "@/i18n";
import { createEmptyPage } from "@/lib/page";
import { useEditorStore } from "@/store/editorStore";
import { PageStrip } from "./PageStrip";

// No canvas in the test DOM: thumbnails are not drawn.
vi.mock("./renderPage", () => ({ renderPageCanvas: () => Promise.reject(new Error("no canvas")) }));

const store = () => useEditorStore.getState();
const pageButtons = () => within(screen.getByRole("navigation", { name: "Pages du chapitre" })).getAllByRole("button", { name: /^Page \d+$/ });

describe("page strip", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "fr" });
    store().loadPage(createEmptyPage());
  });

  it("adds pages and marks the one being edited", () => {
    render(<PageStrip />);
    expect(pageButtons()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^\+?\s*Page$/ }));
    expect(pageButtons()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Page 1" }));
    expect(store().currentPage).toBe(0);
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  });

  it("duplicates a page", () => {
    store().addPanel();
    render(<PageStrip />);
    fireEvent.click(screen.getByRole("button", { name: "Dupliquer la Page 1" }));
    expect(store().pages).toHaveLength(2);
    expect(store().pages[1].panels).toHaveLength(1);
  });

  it("asks before deleting a page, and never offers to delete the last one", () => {
    render(<PageStrip />);
    expect(screen.queryByRole("button", { name: /Supprimer la Page/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^\+?\s*Page$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la Page 1" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Supprimer la page 1 ?");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(store().pages).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la Page 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la page" }));
    expect(store().pages).toHaveLength(1);
  });

  it("moves a page with Alt + arrows", () => {
    store().addPage();
    const [first, second] = store().pages.map((p) => p.id);
    render(<PageStrip />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Page 2" }), { key: "ArrowLeft", altKey: true });
    expect(store().pages.map((p) => p.id)).toEqual([second, first]);
    expect(store().page.id).toBe(second); // still editing the page that moved
  });
});
