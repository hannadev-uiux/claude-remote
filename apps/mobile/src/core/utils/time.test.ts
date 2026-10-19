import { describe, expect, test } from 'vitest'
import { createI18n } from '../i18n/create'
import { relativeTime, shortPath } from './time'

describe('relativeTime', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  const pt = createI18n('pt-BR').t
  const en = createI18n('en-US').t
  const es = createI18n('es-ES').t
  test.each([
    ['2026-10-14T11:59:50Z', 'agora', 'now', 'ahora'],
    ['2026-10-14T11:55:00Z', '5 min', '5 min', '5 min'],
    ['2026-10-14T11:59:00Z', '1 min', '1 min', '1 min'],
    ['2026-10-14T09:00:00Z', '3 h', '3 h', '3 h'],
    ['2026-10-13T10:00:00Z', 'ontem', 'yesterday', 'ayer'],
    ['2026-10-11T12:00:00Z', '3 d', '3 d', '3 d'],
    ['invalid', '', '', ''],
  ])('%s → %s / %s / %s', (iso, inPt, inEn, inEs) => {
    expect(relativeTime(iso, pt, now)).toBe(inPt)
    expect(relativeTime(iso, en, now)).toBe(inEn)
    expect(relativeTime(iso, es, now)).toBe(inEs)
  })

  test('shortens home paths', () => {
    expect(shortPath('/Users/maarkn/workspaces/api')).toBe('~/workspaces/api')
    expect(shortPath('/opt/x')).toBe('/opt/x')
  })
})
