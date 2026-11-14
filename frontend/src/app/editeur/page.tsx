import { Editor } from "@/components/editor/Editor";

// Phase 1: a single local page. Will become /editeur/[pageId] when pages
// are stored on the server (phase 2).
export default function EditorPage() {
  return <Editor />;
}
