import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { composerPlaceholder } from './composer-placeholder'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

test('names the agent when known, says "the agent" otherwise, and flags read-only sessions', () => {
  expect(composerPlaceholder('claude', false, en)).toBe('Message Claude Code…')
  expect(composerPlaceholder(null, false, en)).toBe('Message the agent…')
  expect(composerPlaceholder('claude', true, en)).toBe('Read-only session')
  expect(composerPlaceholder(null, false, pt)).toBe('Mensagem para o agente…')
  expect(composerPlaceholder('codex', false, pt)).toBe('Mensagem para Codex…')
})
