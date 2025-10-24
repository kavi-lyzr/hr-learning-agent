import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Editor } from "@tiptap/react";

export const NODE_HANDLES_SELECTED_STYLE_CLASSNAME = "node-handles-selected-style";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUrl(url: string) {
  return /^https?:\/\/\S+$/.test(url);
}

export function duplicateContent(editor: Editor) {
  // Duplicate the current node/content
  const { state } = editor;
  const { selection } = state;
  const node = state.doc.nodeAt(selection.from);
  
  if (node) {
    editor.commands.insertContentAt(selection.to + 1, node.toJSON());
  }
}
