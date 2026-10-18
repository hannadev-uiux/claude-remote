import { LOCALES } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { createI18n } from './create'
import { machineName, resolveMachineName, setMachineName } from './machine'
import { resources } from './resources'

afterEach(() => setMachineName(null))

describe('machine name in the catalogs', () => {
  test('falls back to the generic form, capitalized at the start of a sentence', () => {
    const en = createI18n('en-US').t
    expect(en('errors.disconnected')).toBe("Can't reach your machine.")
    expect(en('errors.timeout')).toBe('Your machine did not respond.')
    expect(createI18n('pt-BR').t('connection.banner.connecting')).toBe('conectando a sua máquina…')
    expect(createI18n('es-ES').t('pairing.errors.unauthorized')).toBe(
      'Tu máquina rechazó la vinculación. Vuelve a vincular.',
    )
  })

  test('uses the registered name in every language', () => {
    setMachineName('  MacBook Pro ')
    expect(machineName()).toBe('MacBook Pro')
    expect(createI18n('en-US').t('errors.timeout')).toBe('MacBook Pro did not respond.')
    expect(createI18n('pt-BR').t('errors.timeout')).toBe('MacBook Pro não respondeu.')
    expect(createI18n('es-ES').t('connection.banner.connecting')).toBe('conectando con MacBook Pro…')
  })

  test('an explicit variable wins over the registered name', () => {
    setMachineName('MacBook Pro')
    expect(createI18n('en-US').t('errors.timeout', { Machine: 'Studio' })).toBe('Studio did not respond.')
  })

  test('other placeholders are untouched', () => {
    expect(createI18n('en-US').t('time.minutes', { count: 3 })).toBe('3 min')
  })

  test.each(LOCALES)('%s spells the machine placeholders exactly', (locale) => {
    const texts = JSON.stringify(resources[locale].translation)
    for (const match of texts.matchAll(/\{\{([^}]*)\}\}/g)) {
      const name = match[1] ?? ''
      if (/machin|maquin|máquin/i.test(name)) expect(['machine', 'Machine']).toContain(name)
    }
  })
})

describe('resolveMachineName', () => {
  test('prefers the alias, then the host, trimmed', () => {
    expect(resolveMachineName(' Studio ', 'mac.local')).toBe('Studio')
    expect(resolveMachineName('', 'mac.local')).toBe('mac.local')
    expect(resolveMachineName(null, '  ')).toBeNull()
    expect(resolveMachineName(undefined, undefined)).toBeNull()
  })
})
