import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { fr } from "./fr";
import { en } from "./en";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  translate,
  useLocaleStore,
} from "./index";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LocaleSync } from "@/components/LocaleSync";

beforeEach(() => {
  useLocaleStore.setState({ locale: DEFAULT_LOCALE });
});

describe("dictionaries", () => {
  it("fr and en have exactly the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it("have no empty translations", () => {
    for (const dict of [fr, en]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), key).not.toBe("");
      }
    }
  });

  it("use the same placeholders in both languages", () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(fr[key]));
    }
  });
});

describe("translate", () => {
  it("returns the text in the requested language", () => {
    expect(translate("fr", "app.tagline")).toBe("Raconte tes histoires en manga.");
    expect(translate("en", "app.tagline")).toBe("Tell your stories as manga.");
  });

  it("fills placeholders and leaves unknown ones untouched", () => {
    expect(translate("fr", "home.phase", { phase: 1 })).toContain("Phase 1");
    expect(translate("en", "home.phase")).toContain("{phase}");
  });
});

describe("locale choice", () => {
  it("defaults to French", () => {
    expect(useLocaleStore.getState().locale).toBe("fr");
  });

  it("switches language from the FR / EN buttons and remembers it", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(useLocaleStore.getState().locale).toBe("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores the saved language on load and updates <html lang>", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    render(<LocaleSync />);
    expect(useLocaleStore.getState().locale).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("ignores invalid saved values", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "klingon");
    expect(readStoredLocale()).toBeNull();
    act(() => {
      render(<LocaleSync />);
    });
    expect(useLocaleStore.getState().locale).toBe("fr");
  });
});
