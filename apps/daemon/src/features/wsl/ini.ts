/**
 * Minimal INI handling for `%UserProfile%\.wslconfig` and `/etc/wsl.conf`: read one value and merge one
 * value while keeping everything else (comments, order, other keys, CRLF line endings) untouched.
 * Sections and keys match case-insensitively, like WSL does.
 */

const SECTION = /^\s*\[([^\]]+)\]\s*(?:[#;].*)?$/
const ENTRY = /^\s*([^=#;[\s][^=]*?)\s*=(.*)$/

function sectionOf(line: string): string | null {
  const match = SECTION.exec(line)
  return match ? (match[1] ?? '').trim().toLowerCase() : null
}

function entryOf(line: string): { key: string; value: string } | null {
  const match = ENTRY.exec(line)
  if (!match) return null
  let value = (match[2] ?? '').replace(/\s+[#;].*$/, '').trim()
  if (/^(["']).*\1$/.test(value) && value.length >= 2) value = value.slice(1, -1)
  return { key: (match[1] ?? '').trim().toLowerCase(), value }
}

function splitLines(text: string): { lines: string[]; eol: '\n' | '\r\n' } {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  if (lines.at(-1) === '') lines.pop()
  return { lines, eol }
}

/** The value of `key` in `[section]` (last one wins), or null when absent. */
export function readIniValue(text: string | null, section: string, key: string): string | null {
  if (!text) return null
  const wantSection = section.toLowerCase()
  const wantKey = key.toLowerCase()
  let current: string | null = null
  let found: string | null = null
  for (const line of splitLines(text).lines) {
    const header = sectionOf(line)
    if (header !== null) {
      current = header
      continue
    }
    if (current !== wantSection) continue
    const entry = entryOf(line)
    if (entry?.key === wantKey) found = entry.value
  }
  return found
}

/**
 * Sets `key=value` in `[section]`: replaces existing entries of that key, else appends it to the last
 * `[section]`, else adds the section at the end. Returns the text unchanged when the value is already set
 * (so callers can skip the write and the backup).
 */
export function setIniValue(text: string | null, section: string, key: string, value: string): string {
  const source = text ?? ''
  const current = readIniValue(source, section, key)
  if (current !== null && current.toLowerCase() === value.toLowerCase()) return source
  const { lines, eol } = splitLines(source)
  const wantSection = section.toLowerCase()
  const wantKey = key.toLowerCase()
  let inSection = false
  let replaced = false
  let lastSectionLine = -1
  const out = lines.map((line, index) => {
    const header = sectionOf(line)
    if (header !== null) {
      inSection = header === wantSection
      if (inSection) lastSectionLine = index
      return line
    }
    if (!inSection) return line
    if (line.trim() !== '' && !/^\s*[#;]/.test(line)) lastSectionLine = index
    const entry = entryOf(line)
    if (entry?.key !== wantKey) return line
    replaced = true
    const indent = /^\s*/.exec(line)?.[0] ?? ''
    return `${indent}${key}=${value}`
  })
  if (!replaced) {
    if (lastSectionLine >= 0) out.splice(lastSectionLine + 1, 0, `${key}=${value}`)
    else {
      if (out.length > 0 && out.at(-1)?.trim() !== '') out.push('')
      out.push(`[${section}]`, `${key}=${value}`)
    }
  }
  return `${out.join(eol)}${eol}`
}
