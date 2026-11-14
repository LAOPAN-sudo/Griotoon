"use client";

import { useEffect, useState } from "react";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** True while the space bar is held (and the user is not typing in a field). */
export function useSpaceKey(): boolean {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault(); // don't scroll the page or "click" a focused button
      setPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setPressed(false);
    };
    // Releasing space outside the window would leave us stuck in pan mode.
    const reset = () => setPressed(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return pressed;
}
