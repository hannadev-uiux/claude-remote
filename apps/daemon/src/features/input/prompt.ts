/** Escapes spaces the way a terminal drag-and-drop does, so the path reads as one token. */
export function escapePath(path: string): string {
  return path.replace(/([\\ ])/g, '\\$1')
}

/** Prompt pasted into the TUI: the text, then each image path on its own line. */
export function buildPrompt(text: string, paths: readonly string[]): string {
  return [text.trim(), ...paths.map(escapePath)].filter((part) => part.length > 0).join('\n')
}
