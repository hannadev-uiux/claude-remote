import { describe, expect, test, vi } from 'vitest'

vi.mock('@/core/connection', () => ({ useDaemonClient: () => null }))

import { DaemonRequestError } from '@/core/connection/daemon-client'
import { promptErrorMessage } from './use-prompt'

describe('promptErrorMessage', () => {
  test('maps daemon errors to friendly messages', () => {
    expect(promptErrorMessage(new DaemonRequestError('not_controllable', 'x'))).toBe(
      'Sessão sem painel tmux: somente leitura.',
    )
    expect(promptErrorMessage(new DaemonRequestError('internal', 'boom'))).toBe('boom')
    expect(promptErrorMessage(new Error('e'))).toBe('e')
  })
})
