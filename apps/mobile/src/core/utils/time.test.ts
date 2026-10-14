import { describe, expect, test } from 'vitest'
import { relativeTime, shortPath } from './time'

describe('relativeTime', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  test.each([
    ['2026-10-14T11:59:50Z', 'agora'],
    ['2026-10-14T11:55:00Z', 'há 5 min'],
    ['2026-10-14T09:00:00Z', 'há 3 h'],
    ['2026-10-11T12:00:00Z', 'há 3 d'],
    ['invalid', ''],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, now)).toBe(expected)
  })

  test('shortens home paths', () => {
    expect(shortPath('/Users/maarkn/workspaces/api')).toBe('~/workspaces/api')
    expect(shortPath('/opt/x')).toBe('/opt/x')
  })
})
