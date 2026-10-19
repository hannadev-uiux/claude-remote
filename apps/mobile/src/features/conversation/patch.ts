import type { DiffLine } from './diff'

/**
 * Codex's `apply_patch` envelope: `*** Begin Patch`, then per file `*** Add File: p` / `*** Update
 * File: p` (optionally `*** Move to: q`) / `*** Delete File: p`, hunks under `@@`, lines prefixed with
 * `+`, `-` or a space, and `*** End Patch`.
 */
const FILE_HEADER = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/
const MOVE_HEADER = /^\*\*\* Move to: (.+)$/

/** The patch text of an `apply_patch` call (`patch` in the conversation, `command` in a permission request). */
export function patchText(input: Record<string, unknown>): string | null {
  const value = input.patch ?? input.command ?? input.input
  return typeof value === 'string' && value.includes('*** ') ? value : null
}

/** Files the call touches: the daemon's `files`, else read from the patch headers. */
export function patchFiles(input: Record<string, unknown>): string[] {
  if (Array.isArray(input.files)) return input.files.filter((f): f is string => typeof f === 'string')
  const patch = patchText(input)
  if (!patch) return []
  const files: string[] = []
  for (const line of patch.split('\n')) {
    const file = FILE_HEADER.exec(line)?.[1] ?? MOVE_HEADER.exec(line)?.[1]
    if (file && !files.includes(file.trim())) files.push(file.trim())
  }
  return files
}

/** Diff lines of a patch: file headers and `@@` as context, `+` / `-` lines colored. */
export function patchDiff(patch: string): DiffLine[] {
  const out: DiffLine[] = []
  for (const line of patch.replace(/\n$/, '').split('\n')) {
    if (line === '*** Begin Patch' || line === '*** End Patch' || line === '*** End of File') continue
    const file = FILE_HEADER.exec(line)?.[1] ?? MOVE_HEADER.exec(line)?.[1]
    if (file) out.push({ kind: 'context', text: line.startsWith('*** Move') ? `→ ${file}` : file })
    else if (line.startsWith('@@')) out.push({ kind: 'context', text: '⋯' })
    else if (line.startsWith('+')) out.push({ kind: 'add', text: line.slice(1) })
    else if (line.startsWith('-')) out.push({ kind: 'remove', text: line.slice(1) })
    else out.push({ kind: 'context', text: line.startsWith(' ') ? line.slice(1) : line })
  }
  return out
}
