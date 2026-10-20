import type { CommandItem } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { parseRecents, RECENTS_PER_PROFILE, recentNames, recordUse, sentCommand } from './recents'

const commands: CommandItem[] = [
  { name: 'compact', description: '', source: 'builtin', interactive: false },
  { name: 'figma:implement', description: '', source: 'plugin', interactive: false },
]

describe('recents', () => {
  test('recordUse moves to the front, counts and caps', () => {
    let list = recordUse([], 'compact', 1)
    list = recordUse(list, 'model', 2)
    list = recordUse(list, 'compact', 3)
    expect(list).toEqual([
      { name: 'compact', at: 3, count: 2 },
      { name: 'model', at: 2, count: 1 },
    ])
    for (let i = 0; i < 30; i++) list = recordUse(list, `c${i}`, 10 + i)
    expect(list).toHaveLength(RECENTS_PER_PROFILE)
    expect(list[0]?.name).toBe('c29')
  })

  test('recentNames orders by last use', () => {
    expect(
      recentNames([
        { name: 'a', at: 1, count: 9 },
        { name: 'b', at: 5, count: 1 },
      ]),
    ).toEqual(['b', 'a'])
    expect(recentNames(undefined)).toEqual([])
  })

  test('sentCommand names only listed commands at the start', () => {
    expect(sentCommand('/compact keep the plan', commands)).toBe('compact')
    expect(sentCommand('  /figma:implement', commands)).toBe('figma:implement')
    expect(sentCommand('/unknown', commands)).toBeNull()
    expect(sentCommand('run /compact', commands)).toBeNull()
  })

  test('parseRecents drops malformed data', () => {
    expect(parseRecents(null)).toEqual({})
    expect(parseRecents('not json')).toEqual({})
    expect(parseRecents('[]')).toEqual({})
    expect(
      parseRecents(JSON.stringify({ p1: [{ name: 'x', at: 1, count: 1 }, { name: 2 }], p2: 'bad', p3: [] })),
    ).toEqual({ p1: [{ name: 'x', at: 1, count: 1 }] })
  })
})
