import { describe, expect, test } from 'vitest'
import { activeWindow, formatPercent, formatReset, formatTokens, statusItems, statusLevel } from './logic'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const HOUR = 60 * 60 * 1000

describe('statusLevel', () => {
  test.each([
    [0, 'normal'],
    [69.9, 'normal'],
    [70, 'warning'],
    [89, 'warning'],
    [90, 'critical'],
    [130, 'critical'],
  ] as const)('%d%% is %s', (percent, level) => {
    expect(statusLevel(percent)).toBe(level)
  })
})

test('formatTokens', () => {
  expect(formatTokens(950)).toBe('950')
  expect(formatTokens(1234)).toBe('1.2k')
  expect(formatTokens(124_000)).toBe('124k')
  expect(formatTokens(200_000)).toBe('200k')
  expect(formatTokens(1_000_000)).toBe('1M')
  expect(formatTokens(1_540_000)).toBe('1.5M')
})

test('formatPercent rounds', () => {
  expect(formatPercent(61.6)).toBe('62%')
})

describe('statusItems', () => {
  const status = {
    model: 'Opus 5.5',
    effort: 'high',
    context: { usedTokens: 124_000, size: 200_000, percent: 62 },
  }
  const limits = {
    fiveHour: { percent: 41, resetsAt: NOW + 3 * HOUR },
    sevenDay: { percent: 92, resetsAt: NOW + 50 * HOUR },
  }

  test('every item, in order, with levels', () => {
    expect(statusItems(status, limits, NOW)).toEqual([
      { key: 'model', text: 'Opus 5.5', percent: null, level: null },
      { key: 'effort', text: 'high', percent: null, level: null },
      { key: 'context', text: '', percent: 62, level: 'normal' },
      { key: 'fiveHour', text: '', percent: 41, level: 'normal' },
      { key: 'sevenDay', text: '', percent: 92, level: 'critical' },
    ])
  })

  test('unknown items are hidden', () => {
    expect(statusItems(null, null, NOW)).toEqual([])
    expect(statusItems({ model: null, effort: null, context: null }, undefined, NOW)).toEqual([])
    expect(statusItems({ ...status, effort: null }, null, NOW).map((i) => i.key)).toEqual([
      'model',
      'context',
    ])
  })

  test('expired windows are hidden', () => {
    const expired = { fiveHour: { percent: 99, resetsAt: NOW - 1 }, sevenDay: limits.sevenDay }
    expect(statusItems(null, expired, NOW).map((i) => i.key)).toEqual(['sevenDay'])
    expect(activeWindow(expired.fiveHour, NOW)).toBeNull()
  })
})

describe('formatReset', () => {
  test('time within a day', () => {
    expect(formatReset(NOW + 3 * HOUR, NOW, 'en-US')).toBe(
      new Date(NOW + 3 * HOUR).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    )
  })

  test('weekday within a week, date after', () => {
    const inDays = formatReset(NOW + 50 * HOUR, NOW, 'en-US')
    expect(inDays).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)
    expect(formatReset(NOW + 10 * 24 * HOUR, NOW, 'en-US')).toMatch(/Oct/)
    expect(formatReset(NOW + 50 * HOUR, NOW, 'pt-BR')).toMatch(/^(seg|ter|qua|qui|sex|sáb|dom)/)
  })
})
