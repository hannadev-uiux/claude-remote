import { LOCALES } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from './create'
import { deviceLocale } from './device'
import { resources } from './resources'

const PLURAL = /_(zero|one|two|few|many|other)$/

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object') throw new Error(`${prefix}: not a string or object`)
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('catalogs', () => {
  const reference = keys(resources['en-US'].translation).sort()

  // `_many` is derived from `_other` at load time (withManyPlurals), so it is not a catalog key.
  test.each(LOCALES)('%s has the same keys as en-US', (locale) => {
    const own = keys(resources[locale].translation).filter((k) => !k.endsWith('_many'))
    expect(own.sort()).toEqual(reference)
  })

  test.each(LOCALES)('%s has complete plural groups (_one and _other)', (locale) => {
    const all = new Set(keys(resources[locale].translation))
    for (const key of all) {
      if (!PLURAL.test(key)) continue
      const base = key.replace(PLURAL, '')
      expect(all.has(`${base}_one`), `${base}_one`).toBe(true)
      expect(all.has(`${base}_other`), `${base}_other`).toBe(true)
      expect(all.has(base), `${base} must not exist next to its plural forms`).toBe(false)
    }
  })

  test.each(LOCALES)('%s has no empty texts', (locale) => {
    const t = createI18n(locale).t
    for (const key of reference) expect(t(key as 'common.cancel').trim(), key).not.toBe('')
  })
})

describe('createI18n', () => {
  test('translates, interpolates and pluralizes', () => {
    const pt = createI18n('pt-BR').t
    expect(pt('common.cancel')).toBe('Cancelar')
    expect(pt('permissions.queued', { count: 1 })).toBe('+1 pedido na fila')
    expect(pt('permissions.queued', { count: 3 })).toBe('+3 pedidos na fila')
    expect(createI18n('es-ES').t('settings.forgetButton')).toBe('Olvidar daemon')
    expect(createI18n('en-US').t('subagents.more', { count: 2, running: 1 })).toBe('+2 subagents (1 running)')
  })

  test('uses the _other form for the many plural category (millions)', () => {
    for (const locale of ['pt-BR', 'es-ES'] as const) {
      const t = createI18n(locale).t
      expect(t('conversation.moreLines', { count: 1_000_000 })).not.toMatch(/lines/)
    }
  })

  test('does not escape interpolated values', () => {
    expect(createI18n('en-US').t('setupGuide.help', { url: 'https://a.b/?x=1&y=<2>' })).toBe(
      'Questions or problems: https://a.b/?x=1&y=<2>',
    )
  })
})

describe('deviceLocale', () => {
  test.each([
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['es-MX', 'es-ES'],
    ['es-419', 'es-ES'],
    ['en-GB', 'en-US'],
    ['fr-FR', 'en-US'],
  ] as const)('%s → %s', (tag, expected) => {
    expect(deviceLocale([{ languageTag: tag }, { languageTag: 'pt-BR' }])).toBe(expected)
  })

  test('falls back to en-US without languages', () => {
    expect(deviceLocale([])).toBe('en-US')
  })
})
