import { describe, expect, test, vi } from 'vitest'

vi.mock('@/core/connection', () => ({ useDaemonClient: () => null }))

import { DaemonRequestError } from '@/core/connection/daemon-client'
import { createI18n } from '@/core/i18n/create'
import { promptErrorMessage, uploadErrorMessage } from './use-prompt'

describe('promptErrorMessage', () => {
  test('maps daemon errors to friendly messages', () => {
    const t = createI18n('pt-BR').t
    expect(promptErrorMessage(new DaemonRequestError('not_controllable', 'x'), t)).toBe(
      'Sessão sem painel tmux: somente leitura.',
    )
    expect(promptErrorMessage(new DaemonRequestError('disconnected', 'x'), t)).toBe(
      'Sem conexão com sua máquina.',
    )
    expect(promptErrorMessage(new DaemonRequestError('internal', 'boom'), t)).toBe('boom')
    expect(promptErrorMessage(new Error('e'), t)).toBe('e')
  })

  test('follows the language', () => {
    expect(promptErrorMessage(new DaemonRequestError('too_large', 'x'), createI18n('en-US').t)).toBe(
      'Prompt too large (max. 100 KB).',
    )
  })

  test('a missing attachment is only blamed when the prompt had one', () => {
    const t = createI18n('en-US').t
    const notFound = new DaemonRequestError('not_found', 'x')
    expect(promptErrorMessage(notFound, t, true)).toBe(t('attachments.errors.expired'))
    expect(promptErrorMessage(notFound, t)).toBe(t('errors.notFound'))
  })
})

describe('uploadErrorMessage', () => {
  test('maps attachment errors and old daemons', () => {
    const t = createI18n('es-ES').t
    expect(uploadErrorMessage(new DaemonRequestError('too_large', 'x'), t)).toBe(
      t('attachments.errors.tooLarge'),
    )
    expect(uploadErrorMessage(new DaemonRequestError('unsupported_media', 'x'), t)).toBe(
      t('attachments.errors.unsupported'),
    )
    expect(uploadErrorMessage(new DaemonRequestError('unknown_type', 'x'), t)).toBe(
      t('attachments.errors.daemonOutdated'),
    )
  })
})
