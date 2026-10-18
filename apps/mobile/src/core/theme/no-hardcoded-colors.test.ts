import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const SRC = fileURLToPath(new URL('../..', import.meta.url))

/** A quoted `#RRGGBB` / `#RRGGBBAA` literal (comments and issue numbers like `#152` do not count). */
const COLOR_LITERAL = /['"`]#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?['"`]/

/** Where literals are allowed: the theme module, generated files, tests and the widget runtime. */
function allowed(path: string): boolean {
  return (
    path.startsWith(`core${sep}theme${sep}`) ||
    path.endsWith('.generated.ts') ||
    path.endsWith('.test.ts') ||
    // Runs in the widget runtime without app state: its dark fallbacks have to be literals.
    path === join('features', 'live-status', 'SessionActivity.tsx')
  )
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('theme tokens', () => {
  test('no hex color literal outside the theme module', () => {
    const offenders = sourceFiles(SRC)
      .map((file) => relative(SRC, file))
      .filter((path) => !allowed(path))
      .flatMap((path) => {
        const lines = readFileSync(join(SRC, path), 'utf8').split('\n')
        return lines.flatMap((line, index) => (COLOR_LITERAL.test(line) ? [`${path}:${index + 1}`] : []))
      })
    expect(offenders).toEqual([])
  })
})
