import type { TranscriptEntry } from '@remote-harness/protocol'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { codeLabel, plainText, toolTabCopyText } from './copy'

const base = { timestamp: null, isSidechain: false, cursor: 1, index: 0, uuid: 'u', key: 'k' }
const use = {
  ...base,
  kind: 'tool_use',
  toolUseId: 't1',
  name: 'Bash',
  input: { command: 'pnpm check' },
} as Extract<TranscriptEntry, { kind: 'tool_use' }>
const result = {
  ...base,
  kind: 'tool_result',
  toolUseId: 't1',
  content: 'ok\n',
  isError: false,
  truncated: false,
  images: [],
} as Extract<TranscriptEntry, { kind: 'tool_result' }>

describe('toolTabCopyText', () => {
  test('Output copies the whole result, JSON the JSON, Input nothing', () => {
    const long = { ...result, content: 'x'.repeat(5_000) }
    expect(toolTabCopyText('output', use, long)).toHaveLength(5_000)
    expect(JSON.parse(toolTabCopyText('json', use, result) ?? '')).toMatchObject({ name: 'Bash' })
    expect(toolTabCopyText('input', use, result)).toBeNull()
  })

  test('Output without a result or with an empty one copies nothing', () => {
    expect(toolTabCopyText('output', use, null)).toBeNull()
    expect(toolTabCopyText('output', use, { ...result, content: '' })).toBeNull()
  })
})

describe('codeLabel', () => {
  test('first word of the fence info', () => {
    expect(codeLabel('bash')).toBe('bash')
    expect(codeLabel(' ts title=a.ts ')).toBe('ts')
    expect(codeLabel('')).toBeNull()
    expect(codeLabel(undefined)).toBeNull()
  })
})

describe('plainText', () => {
  test('flattens nested elements to their strings', () => {
    const node = ['Run ', createElement('span', null, 'pnpm ', createElement('b', null, 'check')), ' now', 1]
    expect(plainText(node)).toBe('Run pnpm check now1')
    expect(plainText(null)).toBe('')
  })
})
