import type { TranscriptEntry } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import { diffForTool } from './diff'
import { summarizeTool } from './summarize-tool'
import { buildTimeline, mergeEntries } from './timeline'

const base = { timestamp: null, isSidechain: false }
const e = {
  user: (c: number, text: string): TranscriptEntry => ({
    ...base,
    kind: 'user',
    text,
    cursor: c,
    index: 0,
    uuid: `u${c}`,
    key: `u${c}:0`,
  }),
  use: (c: number, id: string): TranscriptEntry => ({
    ...base,
    kind: 'tool_use',
    toolUseId: id,
    name: 'Bash',
    input: { command: 'ls' },
    cursor: c,
    index: 0,
    uuid: `t${c}`,
    key: `t${c}:0`,
  }),
  result: (c: number, id: string): TranscriptEntry => ({
    ...base,
    kind: 'tool_result',
    toolUseId: id,
    content: 'ok',
    isError: false,
    truncated: false,
    cursor: c,
    index: 0,
    uuid: `r${c}`,
    key: `r${c}:0`,
  }),
}

describe('timeline', () => {
  test('pairs tool calls with results', () => {
    const items = buildTimeline([e.user(0, 'oi'), e.use(1, 'a'), e.result(2, 'a'), e.result(3, 'orphan')])
    expect(items.map((i) => i.type)).toEqual(['user', 'tool', 'tool'])
    expect(items[1]).toMatchObject({ use: { toolUseId: 'a' }, result: { toolUseId: 'a' } })
    expect(items[2]).toMatchObject({ use: null, result: { toolUseId: 'orphan' } })
  })

  test('merges without duplicates in cursor order', () => {
    const merged = mergeEntries(
      [e.user(2, 'b'), e.user(0, 'a')],
      [e.user(2, 'b'), e.user(5, 'c'), e.user(1, 'x')],
    )
    expect(merged.map((x) => x.cursor)).toEqual([0, 1, 2, 5])
  })
})

describe('summarizeTool', () => {
  test.each([
    ['Bash', { command: 'pnpm test' }, 'Bash(pnpm test)'],
    ['Read', { file_path: '/w/src/app.ts' }, 'Read(app.ts)'],
    ['Grep', { pattern: 'TODO', path: '/w/src' }, 'Grep("TODO" em src)'],
    ['Task', { description: 'Explorar código' }, 'Task(Explorar código)'],
    ['mcp__github__create_issue', { title: 'Bug' }, 'github:create_issue(Bug)'],
    ['TodoWrite', { todos: [1, 2] }, 'TodoWrite(2 itens)'],
    ['Unknown', {}, 'Unknown'],
  ])('%s', (name, input, expected) => {
    expect(summarizeTool(name, input)).toBe(expected)
  })
})

describe('diffForTool', () => {
  test('edit diff', () => {
    expect(diffForTool('Edit', { old_string: 'a\nb\n', new_string: 'a\nc\n' })).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'c' },
    ])
  })

  test('write is all additions; other tools have no diff', () => {
    expect(diffForTool('Write', { content: 'x\ny' })).toEqual([
      { kind: 'add', text: 'x' },
      { kind: 'add', text: 'y' },
    ])
    expect(diffForTool('Bash', { command: 'ls' })).toBeNull()
  })
})
