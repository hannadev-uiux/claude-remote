import { expect, test } from 'vitest'
import { nextEnabled } from './menu-nav'

const items = [{}, { disabled: true }, {}, { disabled: true }]

test('↓ enters at the first item and skips disabled ones', () => {
  expect(nextEnabled(items, -1, 1)).toBe(0)
  expect(nextEnabled(items, 0, 1)).toBe(2)
})

test('↑ enters at the last enabled item', () => {
  expect(nextEnabled(items, -1, -1)).toBe(2)
  expect(nextEnabled(items, 2, -1)).toBe(0)
})

test('stays put at the ends and with nothing enabled', () => {
  expect(nextEnabled(items, 2, 1)).toBe(2)
  expect(nextEnabled(items, 0, -1)).toBe(0)
  expect(nextEnabled([{ disabled: true }], -1, 1)).toBe(-1)
})
