// Page document format. Source of truth: docs/04-modele-donnees.md.
// Keep in sync with the backend Pydantic schemas (phase 2).

export type BubbleType = "speech" | "thought" | "shout" | "narration";

export interface PanelImage {
  /** Phase 1: WebP dataURL. Phase 2: MinIO URL. */
  src: string;
  /** Real size of the stored image, in pixels. */
  width: number;
  height: number;
  /** Crop: top-left corner of the image inside the panel, in page pixels. */
  offsetX: number;
  offsetY: number;
  /** Displayed size = width × scale, height × scale. */
  scale: number;
}

export interface Panel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  border: { width: number; color: string };
  /** Background colour inside the panel, under the image (white when absent). */
  fill?: string;
  image: PanelImage | null;
  /** Character ids, used by AI generation (phases 3 and 4). */
  characters: string[];
  /** Scene description, used by AI generation (phases 2 and 3). */
  description?: string;
  /** Hidden in the editor and in exports (still listed in the layers). */
  hidden?: boolean;
  z: number;
}

export interface Bubble {
  id: string;
  type: BubbleType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, around the (x, y) corner as in Konva. */
  rotation: number;
  /** Tail tip position, in page coordinates. Absent for narration boxes. */
  tail?: { x: number; y: number };
  text: string;
  fontFamily: string;
  fontSize: number;
  align: "left" | "center" | "right";
  panelId?: string;
  hidden?: boolean;
  z: number;
}

export interface Sfx {
  id: string;
  text: string;
  /** Top-left corner, also the rotation centre (as in Konva). */
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  /** Text colour. */
  color: string;
  /** Outline colour; its thickness follows fontSize (see lib/sfx.ts). */
  strokeColor: string;
  hidden?: boolean;
  z: number;
}

export interface Page {
  version: 1;
  /** Stable id (thumbnails, reordering, later the database row). */
  id: string;
  width: number;
  height: number;
  background: string;
  gutter: number;
  margin: number;
  panels: Panel[];
  bubbles: Bubble[];
  sfx: Sfx[];
}

/** Any element that can be selected, reordered or deleted on a page. */
export type PageElement = Panel | Bubble | Sfx;

/** A chapter: ordered pages. Phase 1 edits one chapter, saved in the browser. */
export interface Chapter {
  version: 1;
  pages: Page[];
}
