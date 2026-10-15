import { describe, expect, test } from 'vitest'
import { createI18n } from '../../core/i18n/create'
import { commandDescription } from './describe-command'

describe('commandDescription', () => {
  test('translates built-in commands by name and keeps the others', () => {
    const t = createI18n('es-ES').t
    const builtin = {
      name: 'clear',
      description: 'Clear the conversation history',
      source: 'builtin' as const,
      interactive: false,
    }
    expect(commandDescription(builtin, t)).toBe('Borra el historial de la conversación')
    expect(commandDescription({ ...builtin, name: 'brand-new' }, t)).toBe('Clear the conversation history')
    expect(
      commandDescription(
        { name: 'deploy', description: 'Deploy it', source: 'project', interactive: false },
        t,
      ),
    ).toBe('Deploy it')
  })
})
