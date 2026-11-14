// Images in panels: compression on import, and crop maths.
// Crop model (page pixels, panel-local): the image's top-left corner is at
// (offsetX, offsetY) inside the panel, drawn at width × scale by height × scale.
// The image must always COVER the panel: no empty strip inside a panel.

import type { PanelImage } from "@/types/page";

/** Longest side of a stored image, in pixels (docs/06-spec-editeur.md). */
export const MAX_IMAGE_SIDE = 2000;
export const WEBP_QUALITY = 0.82;
/** Files above this size are refused before decoding (protects low-end phones). */
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
/** How far the user can zoom in, relative to the smallest scale that covers the panel. */
export const MAX_ZOOM_FACTOR = 5;

type Crop = Pick<PanelImage, "offsetX" | "offsetY" | "scale">;
type ImageSize = Pick<PanelImage, "width" | "height">;

/** Shrink (never enlarge) a size so that its longest side is at most `max`. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE) {
  const ratio = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** Smallest scale at which the image covers a panel of size w × h. */
export function coverScale(w: number, h: number, image: ImageSize): number {
  return Math.max(w / image.width, h / image.height);
}

/** Initial crop: image covers the panel, centred (like CSS object-fit: cover). */
export function coverCrop(w: number, h: number, image: ImageSize): Crop {
  const scale = coverScale(w, h, image);
  return {
    scale,
    offsetX: (w - image.width * scale) / 2,
    offsetY: (h - image.height * scale) / 2,
  };
}

/** Keep a crop valid: scale within limits and no empty area inside the panel. */
export function clampCrop<T extends Crop & ImageSize>(w: number, h: number, image: T): T {
  const min = coverScale(w, h, image);
  const scale = Math.min(Math.max(image.scale, min), min * MAX_ZOOM_FACTOR);
  const displayedW = image.width * scale;
  const displayedH = image.height * scale;
  // The image's left edge must stay between (w − displayedW) and 0.
  const offsetX = Math.min(0, Math.max(w - displayedW, image.offsetX));
  const offsetY = Math.min(0, Math.max(h - displayedH, image.offsetY));
  return { ...image, scale, offsetX, offsetY };
}

/** Zoom the image to `scale`, keeping the image point under `anchor` (panel-local) fixed. */
export function zoomCrop<T extends Crop & ImageSize>(
  w: number,
  h: number,
  image: T,
  scale: number,
  anchor = { x: w / 2, y: h / 2 },
): T {
  const ratio = scale / image.scale;
  return clampCrop(w, h, {
    ...image,
    scale,
    offsetX: anchor.x - (anchor.x - image.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - image.offsetY) * ratio,
  });
}

export type ImageImportError = "notImage" | "tooLarge" | "decode";

export class ImageImportFailure extends Error {
  constructor(public reason: ImageImportError) {
    super(reason);
  }
}

const SUPPORTED = /^image\/(jpeg|png|webp|gif|avif|bmp)$/;

export function checkImageFile(file: Pick<File, "type" | "size">): ImageImportError | null {
  if (!SUPPORTED.test(file.type)) return "notImage";
  if (file.size > MAX_FILE_BYTES) return "tooLarge";
  return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Decode, downscale to MAX_IMAGE_SIDE and re-encode as WebP (JPEG if the
 * browser can't encode WebP). Browser only. Phone photos are rotated
 * according to their EXIF orientation by createImageBitmap.
 */
export async function compressImage(file: File): Promise<{ src: string; width: number; height: number }> {
  const problem = checkImageFile(file);
  if (problem) throw new ImageImportFailure(problem);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageImportFailure("decode");
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageImportFailure("decode");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, WEBP_QUALITY));
  let blob = await encode("image/webp");
  // Browsers that can't encode WebP silently return PNG (heavy): use JPEG instead.
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new ImageImportFailure("decode");

  return { src: await blobToDataUrl(blob), width, height };
}
