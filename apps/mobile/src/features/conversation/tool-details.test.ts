import type { TranscriptEntry } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import {
  cutText,
  FLAG,
  MAX_SAVED_TYPES,
  parseSavedTabs,
  rememberTab,
  TOOL_TABS,
  tabFor,
  toolCallJson,
  toolInputFields,
  toolType,
} from './tool-details'

const base = { key: 'k', cursor: 0, index: 0, uuid: 'u', timestamp: null, isSidechain: false }
const use = (name: string, input: Record<string, unknown>) =>
  ({ ...base, kind: 'tool_use', toolUseId: 't1', name, input }) satisfies TranscriptEntry
const result = (content: string, isError = false) =>
  ({
    ...base,
    kind: 'tool_result',
    toolUseId: 't1',
    content,
    isError,
    truncated: false,
    images: [],
  }) satisfies TranscriptEntry

describe('toolInputFields', () => {
  test('Bash shows the command, description, timeout and background flag', () => {
    expect(
      toolInputFields('Bash', {
        command: 'pnpm test',
        description: 'Run tests',
        timeout: 60000,
        run_in_background: true,
      }),
    ).toEqual([
      { field: 'command', value: 'pnpm test' },
      { field: 'description', value: 'Run tests' },
      { field: 'timeout', value: '60000' },
      { field: 'background', value: FLAG },
    ])
  })

  test('Read shows the path and a 1-based line range', () => {
    expect(toolInputFields('Read', { file_path: '/src/a.ts', offset: 10, limit: 50 })).toEqual([
      { field: 'path', value: '/src/a.ts' },
      { field: 'lines', value: '10–59' },
    ])
    expect(toolInputFields('Read', { file_path: '/a', offset: 10 })).toContainEqual({
      field: 'lines',
      value: '10–',
    })
    expect(toolInputFields('Read', { file_path: '/a', limit: 20 })).toContainEqual({
      field: 'lines',
      value: '1–20',
    })
    expect(toolInputFields('Read', { file_path: '/a' })).toEqual([{ field: 'path', value: '/a' }])
  })

  test('file edits show the path and a summary, not the content', () => {
    expect(
      toolInputFields('Edit', { file_path: '/a', old_string: 'x', new_string: 'y', replace_all: true }),
    ).toEqual([
      { field: 'path', value: '/a' },
      { field: 'replaceAll', value: FLAG },
    ])
    expect(toolInputFields('MultiEdit', { file_path: '/a', edits: [{}, {}] })).toContainEqual({
      field: 'edits',
      value: '2',
    })
    expect(toolInputFields('Write', { file_path: '/a', content: 'one\ntwo\nthree' })).toContainEqual({
      field: 'lines',
      value: '3',
    })
  })

  test('Grep lists the filters it has', () => {
    expect(
      toolInputFields('Grep', { pattern: 'TODO', path: 'src', glob: '*.ts', output_mode: 'content' }),
    ).toEqual([
      { field: 'pattern', value: 'TODO' },
      { field: 'path', value: 'src' },
      { field: 'glob', value: '*.ts' },
      { field: 'outputMode', value: 'content' },
    ])
  })

  test('TodoWrite lists the items with their status', () => {
    expect(
      toolInputFields('TodoWrite', {
        todos: [
          { content: 'Plan', status: 'completed' },
          { content: 'Code', status: 'in_progress' },
          { content: 'Ship', status: 'pending' },
        ],
      }),
    ).toEqual([{ field: 'todos', value: '☑ Plan\n◐ Code\n☐ Ship' }])
  })

  test('Task shows the agent and prompt', () => {
    expect(
      toolInputFields('Task', { description: 'Search', subagent_type: 'Explore', prompt: 'Find x' }),
    ).toEqual([
      { field: 'description', value: 'Search' },
      { field: 'agent', value: 'Explore' },
      { field: 'prompt', value: 'Find x' },
    ])
  })

  test('unknown tools list their top-level keys, objects as compact JSON', () => {
    expect(
      toolInputFields('mcp__github__create_issue', { title: 'Bug', labels: ['a'], draft: false, body: '' }),
    ).toEqual([
      { key: 'title', value: 'Bug' },
      { key: 'labels', value: '["a"]' },
      { key: 'draft', value: 'false' },
    ])
  })

  test('known tools with unexpected input fall back to the raw keys', () => {
    expect(toolInputFields('Bash', { cmd: 'ls' })).toEqual([{ key: 'cmd', value: 'ls' }])
    expect(toolInputFields('Bash', {})).toEqual([])
  })
})

describe('toolCallJson', () => {
  test('has the name, input and result', () => {
    expect(JSON.parse(toolCallJson(use('Bash', { command: 'ls' }), result('a\nb')))).toEqual({
      name: 'Bash',
      input: { command: 'ls' },
      result: { content: 'a\nb', isError: false, truncated: false },
    })
  })

  test('lists image refs of the result, not their data', () => {
    const ref = { id: '2.0', mediaType: 'image/jpeg', bytes: 100 }
    expect(JSON.parse(toolCallJson(null, { ...result(''), images: [ref] })).result.images).toEqual([ref])
  })

  test('works without a result or without the call', () => {
    expect(JSON.parse(toolCallJson(use('Bash', {}), null)).result).toBeNull()
    expect(JSON.parse(toolCallJson(null, result('x', true)))).toEqual({
      result: { content: 'x', isError: true, truncated: false },
    })
  })
})

describe('cutText', () => {
  test('keeps short texts whole', () => {
    expect(cutText('abc', 5)).toEqual({ text: 'abc', hidden: false })
  })

  test('cuts long texts and flags the rest', () => {
    expect(cutText('abcdef', 4)).toEqual({ text: 'abcd', hidden: true })
  })
})

describe('tab memory', () => {
  test('MCP tools share one type', () => {
    expect(toolType('mcp__github__create_issue')).toBe('mcp')
    expect(toolType('Bash')).toBe('Bash')
  })

  test('opens Output by default and the remembered tab when available', () => {
    const saved = rememberTab({}, 'Grep', 'json')
    expect(tabFor(saved, 'Grep', TOOL_TABS)).toBe('json')
    expect(tabFor(saved, 'Bash', TOOL_TABS)).toBe('output')
    expect(tabFor(rememberTab({}, 'Bash', 'input'), 'Bash', ['output', 'json'])).toBe('output')
    expect(tabFor(rememberTab({}, 'mcp__a__b', 'input'), 'mcp__c__d', TOOL_TABS)).toBe('input')
  })

  test('keeps the newest types up to the cap', () => {
    let saved = {}
    for (let i = 0; i < MAX_SAVED_TYPES + 5; i++) saved = rememberTab(saved, `T${i}`, 'json')
    saved = rememberTab(saved, 'T10', 'input')
    const keys = Object.keys(saved)
    expect(keys).toHaveLength(MAX_SAVED_TYPES)
    expect(keys.at(-1)).toBe('T10')
    expect(keys).not.toContain('T0')
  })

  test('parses only valid stored tabs', () => {
    expect(parseSavedTabs('{"Bash":"json","Read":"nope","Grep":3}')).toEqual({ Bash: 'json' })
    expect(parseSavedTabs('[]')).toEqual({})
    expect(parseSavedTabs('not json')).toEqual({})
    expect(parseSavedTabs(null)).toEqual({})
  })
})
