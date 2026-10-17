import type { CommandItem } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { applySuggestion, filterCommands, findTrigger, isInteractiveCommand, triggerKey } from './trigger'

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
  test('filters by prefix, then substring, then description', () => {
    expect(filterCommands(commands, 'de').map((c) => c.name)).toEqual(['deploy', 'model'])
    expect(filterCommands(commands, 'o').map((c) => c.name)).toEqual(['compact', 'deploy', 'model'])
    expect(filterCommands(commands, 'modelo').map((c) => c.name)).toEqual(['model'])
  })

  test('flags interactive commands', () => {
    expect(isInteractiveCommand('/model', commands)).toBe(true)
    expect(isInteractiveCommand('/compact agora', commands)).toBe(false)
    expect(isInteractiveCommand('oi', commands)).toBe(false)
  })
})
