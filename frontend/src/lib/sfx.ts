// Sound effects ("BAM !", "VLAN !"): big outlined text in the Bangers font.

export const SFX_FONT = "Bangers";
export const DEFAULT_SFX_TEXT = "BAM !";
export const DEFAULT_SFX_FONT_SIZE = 96;
export const MIN_SFX_FONT_SIZE = 16;
export const MAX_SFX_FONT_SIZE = 600;
export const SFX_LINE_HEIGHT = 1;

/** Outline thickness follows the text size, so resizing keeps the same look. */
export function sfxStrokeWidth(fontSize: number): number {
  return Math.max(2, Math.round(fontSize / 12));
}

export function clampSfxFontSize(size: number): number {
  return Math.round(Math.min(MAX_SFX_FONT_SIZE, Math.max(MIN_SFX_FONT_SIZE, size)));
}

/** Preset colours for the text; the outline is black or white. */
export const SFX_COLORS = [
  { value: "#C0392B", key: "sfx.colorRed" },
  { value: "#E67E22", key: "sfx.colorOrange" },
  { value: "#F1C40F", key: "sfx.colorYellow" },
  { value: "#27AE60", key: "sfx.colorGreen" },
  { value: "#2E86DE", key: "sfx.colorBlue" },
  { value: "#8E44AD", key: "sfx.colorPurple" },
  { value: "#111111", key: "sfx.colorBlack" },
  { value: "#FFFFFF", key: "sfx.colorWhite" },
] as const;

export const SFX_STROKES = [
  { value: "#000000", key: "sfx.strokeBlack" },
  { value: "#FFFFFF", key: "sfx.strokeWhite" },
] as const;
