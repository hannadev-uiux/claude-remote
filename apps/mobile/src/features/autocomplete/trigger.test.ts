import type { CommandItem } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { applySuggestion, findTrigger, insertTrigger, isInteractiveCommand, triggerKey } from './trigger'

describe('triggerKey', () => {
  test('stays the same while typing the same token and changes for a new one', () => {
    const typing = triggerKey(findTrigger('olha @sr', 8))
    expect(triggerKey(findTrigger('olha @src/a', 11))).toBe(typing)
    expect(triggerKey(findTrigger('olha @src/a @b', 14))).not.toBe(typing)
    expect(triggerKey(findTrigger('/mo', 3))).toBe('command:0')
    expect(triggerKey(null)).toBeNull()
  })
})

const commands: CommandItem[] = [
  { name: 'model', description: 'Escolhe o modelo', source: 'builtin', interactive: true },
  { name: 'compact', description: 'Compacta', source: 'builtin', interactive: false },
  { name: 'deploy', description: 'Deploy do projeto', source: 'project', interactive: false },
]

describe('findTrigger', () => {
  test('detects @ tokens anywhere', () => {
    expect(findTrigger('revise @src/ap', 14)).toEqual({ kind: 'file', query: 'src/ap', start: 7, end: 14 })
    expect(findTrigger('a @x b', 4)).toEqual({ kind: 'file', query: 'x', start: 2, end: 4 })
  })

  test('detects / only at the start', () => {
    expect(findTrigger('/mo', 3)).toEqual({ kind: 'command', query: 'mo', start: 0, end: 3 })
    expect(findTrigger('use /model', 10)).toBeNull()
    expect(findTrigger('plain text', 5)).toBeNull()
  })
})

describe('applySuggestion', () => {
  test('inserts files with a trailing space and dirs without', () => {
    const t = findTrigger('ver @ap e', 7)!
    expect(
      applySuggestion('ver @ap e', t, { kind: 'file', item: { path: 'src/app.ts', kind: 'file' } }),
    ).toEqual({
      text: 'ver @src/app.ts e',
      cursor: 16,
    })
    const d = findTrigger('@sr', 3)!
    expect(applySuggestion('@sr', d, { kind: 'file', item: { path: 'src/', kind: 'dir' } })).toEqual({
      text: '@src/',
      cursor: 5,
    })
  })

  test('inserts commands', () => {
    const t = findTrigger('/mo', 3)!
    expect(applySuggestion('/mo', t, { kind: 'command', item: commands[0]! }).text).toBe('/model ')
  })
})

describe('commands', () => {
  test('flags interactive commands', () => {
    expect(isInteractiveCommand('/model', commands)).toBe(true)
    expect(isInteractiveCommand('/compact agora', commands)).toBe(false)
    expect(isInteractiveCommand('oi', commands)).toBe(false)
  })
})

describe('insertTrigger', () => {
  test('@ goes at the cursor, after a space when needed, and opens file suggestions', () => {
    const next = insertTrigger('read', 4, '@')
    expect(next).toEqual({ text: 'read @', cursor: 6 })
    expect(next && findTrigger(next.text, next.cursor)).toMatchObject({ kind: 'file', query: '' })
    expect(insertTrigger('read ', 5, '@')).toEqual({ text: 'read @', cursor: 6 })
    expect(insertTrigger('', 0, '@')).toEqual({ text: '@', cursor: 1 })
    expect(insertTrigger('a\nb', 2, '@')).toEqual({ text: 'a\n@b', cursor: 3 })
    expect(insertTrigger('ab', 1, '@')).toEqual({ text: 'a @b', cursor: 3 })
    expect(insertTrigger('ab', 99, '@')).toEqual({ text: 'ab @', cursor: 4 })
  })

  test('/ only starts a blank prompt', () => {
    const next = insertTrigger('  ', 2, '/')
    expect(next).toEqual({ text: '/', cursor: 1 })
    expect(next && findTrigger(next.text, next.cursor)).toMatchObject({ kind: 'command', query: '' })
    expect(insertTrigger('fix it', 6, '/')).toBeNull()
  })
})
