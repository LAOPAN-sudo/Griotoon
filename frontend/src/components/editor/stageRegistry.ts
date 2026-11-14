import type Konva from "konva";

// The editor's Konva stage, registered by EditorCanvas and read by the
// export. Kept outside React state: nothing re-renders when it changes.
let currentStage: Konva.Stage | null = null;

export function registerStage(stage: Konva.Stage | null) {
  currentStage = stage;
}

export function getStage(): Konva.Stage | null {
  return currentStage;
}
