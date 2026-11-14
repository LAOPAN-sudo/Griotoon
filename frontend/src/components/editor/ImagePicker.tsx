"use client";

import { useEffect, useRef } from "react";
import { importImageIntoPanel, registerImagePicker } from "./imageImport";

/** Hidden file input used by the "Image" button and by double-click on an empty panel. */
export function ImagePicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

  useEffect(() => {
    registerImagePicker((panelId) => {
      targetRef.current = panelId;
      inputRef.current?.click();
    });
    return () => registerImagePicker(null);
  }, []);

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"
      className="hidden"
      data-testid="image-input"
      onChange={(e) => {
        const file = e.target.files?.[0];
        const panelId = targetRef.current;
        e.target.value = ""; // allow picking the same file again
        if (file && panelId) void importImageIntoPanel(file, panelId);
      }}
    />
  );
}
