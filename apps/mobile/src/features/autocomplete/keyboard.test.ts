import type { CommandItem, FileItem } from '@remote-harness/protocol'
import { expect, test } from 'vitest'
import { moveHighlight, pickableRows } from './keyboard'

const file = (path: string) => ({ path, kind: 'file' }) as FileItem
const command = (name: string) => ({ name }) as CommandItem

test('pickableRows lists files as shown', () => {
  const rows = pickableRows({ kind: 'file', items: [file('a.ts'), file('b.ts')], loading: false })
  expect(rows.map((r) => (r.kind === 'file' ? r.item.path : ''))).toEqual(['a.ts', 'b.ts'])
})

test('pickableRows flattens command sections in order', () => {
  const rows = pickableRows({
    kind: 'command',
    query: '',
    loading: false,
    sections: [
      { key: 'recent', data: [{ item: command('model'), indices: [] }] },
      {
        key: 'builtin',
        data: [
          { item: command('clear'), indices: [] },
          { item: command('compact'), indices: [] },
        ],
      },
    ],
  })
  expect(rows.map((r) => (r.kind === 'command' ? r.item.name : ''))).toEqual(['model', 'clear', 'compact'])
})

test('pickableRows is empty without suggestions', () => {
  expect(pickableRows(null)).toEqual([])
})

test('moveHighlight stays within the rows', () => {
  expect(moveHighlight(3, 0, 1)).toBe(1)
  expect(moveHighlight(3, 2, 1)).toBe(2)
  expect(moveHighlight(3, 0, -1)).toBe(0)
  expect(moveHighlight(0, 0, 1)).toBe(0)
})
