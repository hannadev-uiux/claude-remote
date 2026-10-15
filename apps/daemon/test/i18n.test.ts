import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { LOCALES } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import { configuredLocaleSync, defaultProfiles, effectiveLocale } from '../src/core/config.ts'
import { CATALOGS, createI18n, messagesFor, systemLocale } from '../src/core/i18n/index.ts'
import { BANNER_WIDTH, createPaint, renderWelcome } from '../src/features/setup/banner.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

/** `path → kind`, where kind is `string` or `fn/<arity>`. */
function shape(value: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'function') out.set(path, `fn/${child.length}`)
    else if (child && typeof child === 'object') for (const [k, v] of shape(child, path)) out.set(k, v)
    else out.set(path, typeof child)
  }
  return out
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('catalogs', () => {
  const reference = shape(CATALOGS['en-US'])

  test.each(LOCALES)('%s has exactly the keys and function arities of en-US', (locale) => {
    expect(Object.fromEntries(shape(CATALOGS[locale]))).toEqual(Object.fromEntries(reference))
  })

  test.each(LOCALES)('%s has no empty texts', (locale) => {
    for (const text of strings(CATALOGS[locale])) expect(text.trim()).not.toBe('')
  })

  test.each(LOCALES)('%s welcome box fits the banner', (locale) => {
    const lines = renderWelcome(createPaint(false), '10.20.30', messagesFor(locale).setup.welcome).split('\n')
    for (const line of lines) expect([...stripVTControlCharacters(line)].length).toBe(BANNER_WIDTH)
    const done = messagesFor(locale).setup.done
    const fixed = [
      done.footer,
      done.openTerminal('source ~/.zshrc'),
      done.pairIfNeeded('claude-remote pair'),
      done.connectAndPair('claude-remote pair'),
    ]
    for (const text of fixed) expect([...text].length).toBeLessThanOrEqual(BANNER_WIDTH - 4)
  })

  test('createI18n returns the catalog of the locale', () => {
    expect(createI18n('es-ES')).toEqual({ locale: 'es-ES', m: CATALOGS['es-ES'] })
    expect(messagesFor('en-US').push.sessionDone).toBe('Session finished')
    expect(messagesFor('en-US').claudeCode.denied).toBe('Denied by Claude Remote')
  })
})

describe('systemLocale', () => {
  test('follows CLAUDE_REMOTE_LANG, then LC_ALL, LC_MESSAGES and LANG', () => {
    expect(systemLocale({ LANG: 'pt_BR.UTF-8' })).toBe('pt-BR')
    expect(systemLocale({ LANG: 'es_MX.UTF-8' })).toBe('es-ES')
    expect(systemLocale({ LC_MESSAGES: 'es_ES.UTF-8', LANG: 'pt_BR.UTF-8' })).toBe('es-ES')
    expect(systemLocale({ LC_ALL: 'en_US.UTF-8', LC_MESSAGES: 'es_ES', LANG: 'pt_BR' })).toBe('en-US')
    expect(systemLocale({ CLAUDE_REMOTE_LANG: 'pt-BR', LC_ALL: 'es_ES.UTF-8' })).toBe('pt-BR')
    expect(systemLocale({ LC_ALL: '', LANG: 'es_ES.UTF-8' })).toBe('es-ES')
  })

  test('falls back to en-US', () => {
    expect(systemLocale({})).toBe('en-US')
    expect(systemLocale({ LANG: 'fr_FR.UTF-8' })).toBe('en-US')
    expect(systemLocale({ LANG: 'C' })).toBe('en-US')
  })
})

describe('configured language', () => {
  test('config language wins over the system one', () => {
    expect(effectiveLocale({ language: 'es-ES' }, { LANG: 'pt_BR.UTF-8' })).toBe('es-ES')
    expect(effectiveLocale({}, { LANG: 'pt_BR.UTF-8' })).toBe('pt-BR')
  })

  test('reads the config file leniently', async () => {
    const dir = join(home.dir(), '.claude-remote')
    const path = join(dir, 'config.json')
    const env = { LANG: 'pt_BR.UTF-8' }
    expect(configuredLocaleSync(path, env)).toBe('pt-BR')
    await mkdir(dir, { recursive: true })
    await writeFile(path, '{ not json')
    expect(configuredLocaleSync(path, env)).toBe('pt-BR')
    await writeFile(path, JSON.stringify({ language: 'xx' }))
    expect(configuredLocaleSync(path, env)).toBe('pt-BR')
    await writeFile(path, JSON.stringify({ profiles: [], language: 'es-ES' }))
    expect(configuredLocaleSync(path, env)).toBe('es-ES')
  })

  test('default profile name follows the language', () => {
    expect(defaultProfiles('en-US')[0]?.name).toBe('Personal')
    expect(defaultProfiles('pt-BR')[0]?.name).toBe('Pessoal')
  })
})
