import { describe, expect, test } from 'vitest'
import {
  conflictingPaths,
  DEMO_SESSIONS,
  demoConfig,
  demoLayout,
  paneText,
  projectDirName,
  sessionCwd,
  statusLineBody,
  transcriptLines,
} from '../scripts/demo-data.ts'
import { ConfigSchema } from '../src/core/config.ts'
import { parseTranscriptLine } from '../src/features/transcript/parser.ts'

const layout = demoLayout('/Users/Shared')

describe('demo sandbox', () => {
  test('owns only its folders under the root', () => {
    expect(layout.owned).toEqual([
      '/Users/Shared/.remote-harness-demo',
      '/Users/Shared/code',
      '/Users/Shared/.claude',
      '/Users/Shared/.claude-work',
      '/Users/Shared/.claude-openrouter',
      '/Users/Shared/.codex',
    ])
  })

  test('refuses folders that exist and are not in its manifest', () => {
    const existing = new Set(['/Users/Shared/code', '/Users/Shared/.claude'])
    const exists = (p: string) => existing.has(p)
    expect(conflictingPaths(layout.owned, [], exists)).toEqual([
      '/Users/Shared/code',
      '/Users/Shared/.claude',
    ])
    expect(conflictingPaths(layout.owned, layout.owned, exists)).toEqual([])
  })

  test('the config is valid, on its own ports, without push', () => {
    const config = ConfigSchema.parse(demoConfig())
    expect(config.wsPort).not.toBe(7337)
    expect(config.hookPort).not.toBe(7338)
    expect(config.push).toBe('off')
    expect(config.profiles.map((p) => p.name)).toEqual(['Personal', 'Work', 'OpenRouter', 'Codex'])
  })

  test('covers every session state, one waiting on a permission', () => {
    expect(new Set(DEMO_SESSIONS.map((s) => s.state))).toEqual(
      new Set(['waiting', 'running', 'idle', 'ended']),
    )
    const waiting = DEMO_SESSIONS.filter((s) => s.state === 'waiting')
    expect(waiting).toHaveLength(1)
    expect(waiting[0]?.permission?.toolName).toBe('Bash')
  })
})

describe('demo transcripts', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')

  test('the parser reads every entry, with the session title first', () => {
    for (const session of DEMO_SESSIONS) {
      const cwd = sessionCwd(layout.code, session)
      const lines = transcriptLines(session, cwd, now)
      expect(JSON.parse(lines[0]!)).toMatchObject({ type: 'custom-title', customTitle: session.title })
      const kinds = lines.slice(2).flatMap((line, i) => parseTranscriptLine(line, i).map((e) => e.kind))
      expect(kinds).not.toContain('unknown')
      expect(kinds.length).toBeGreaterThanOrEqual(session.entries.length)
      const last = JSON.parse(lines.at(-1)!)
      expect(Date.parse(last.timestamp)).toBe(now - session.minutesAgo * 60_000)
    }
  })

  test('tool paths are inside the session folder', () => {
    const session = DEMO_SESSIONS.find((s) => s.state === 'running')!
    const cwd = sessionCwd(layout.code, session)
    const edits = transcriptLines(session, cwd, now)
      .map((l) => JSON.parse(l))
      .flatMap((l) => (Array.isArray(l.message?.content) ? l.message.content : []))
      .filter((c: { type: string; name?: string }) => c.type === 'tool_use' && c.name === 'Edit')
    expect(edits.length).toBeGreaterThan(0)
    for (const edit of edits) expect(edit.input.file_path.startsWith(`${cwd}/`)).toBe(true)
  })

  test('worktree sessions live under .claude/worktrees', () => {
    expect(sessionCwd('/w', { repo: 'acme-api', worktree: 'rate-limit' })).toBe(
      '/w/acme-api/.claude/worktrees/rate-limit',
    )
    expect(projectDirName('/Users/Shared/code/acme-api')).toBe('-Users-Shared-code-acme-api')
  })

  test('status line only for sessions that have one', () => {
    const running = DEMO_SESSIONS.find((s) => s.status)!
    expect(statusLineBody(running, '/t.jsonl', now)).toMatchObject({
      session_id: running.id,
      context_window: { used_percentage: running.status!.contextUsed },
    })
    expect(statusLineBody({ ...running, status: undefined }, '/t.jsonl', now)).toBeNull()
  })

  test('the pane shows only the changed lines of an edit', () => {
    const running = DEMO_SESSIONS.find((s) => s.state === 'running')!
    const text = paneText(running)
    expect(text).toContain('+ <ThemeToggle value={theme} onChange={setTheme} />')
    expect(text).not.toContain('- <Section title="Appearance">')
  })

  test('the pane ends in the prompt box and the mode line', () => {
    const waiting = DEMO_SESSIONS.find((s) => s.state === 'waiting')!
    const text = paneText(waiting)
    expect(text).toContain('Do you want to proceed?')
    expect(text.trimEnd().endsWith('? for shortcuts\x1b[0m')).toBe(true)
  })
})
