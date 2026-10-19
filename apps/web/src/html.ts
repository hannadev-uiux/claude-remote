const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Text safe inside element content and double-quoted attributes. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/**
 * Escapes, then renders the two bits of markup the catalogs may use: `code` spans and
 * [label](url) links (absolute `https://`, site-relative `/…` or in-page `#…` URLs).
 */
export function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|#[^\s)]+)\)/g, '<a href="$2">$1</a>')
}
