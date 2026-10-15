import { describe, expect, test, vi } from 'vitest'

vi.mock('@/core/connection', () => ({ useDaemonClient: () => null }))

import { DaemonRequestError } from '@/core/connection/daemon-client'
import { createI18n } from '@/core/i18n/create'
import { promptErrorMessage } from './use-prompt'

describe('promptErrorMessage', () => {
  test('maps daemon errors to friendly messages', () => {
    const t = createI18n('pt-BR').t
    expect(promptErrorMessage(new DaemonRequestError('not_controllable', 'x'), t)).toBe(
      'Sessão sem painel tmux: somente leitura.',
    )
    expect(promptErrorMessage(new DaemonRequestError('disconnected', 'x'), t)).toBe(
      'Sem conexão com o daemon.',
    )
    expect(promptErrorMessage(new DaemonRequestError('internal', 'boom'), t)).toBe('boom')
    expect(promptErrorMessage(new Error('e'), t)).toBe('e')
  })

  test('follows the language', () => {
    expect(promptErrorMessage(new DaemonRequestError('too_large', 'x'), createI18n('en-US').t)).toBe(
      'Prompt too large (max. 100 KB).',
    )
  })
})
