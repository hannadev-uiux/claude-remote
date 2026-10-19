import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { composerPlaceholder } from './composer-placeholder'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

test('names the agent when known, says "the agent" otherwise, and flags read-only sessions', () => {
  expect(composerPlaceholder('claude', false, en)).toBe('message Claude Code… (@ files, / commands)')
  expect(composerPlaceholder(null, false, en)).toBe('message the agent… (@ files, / commands)')
  expect(composerPlaceholder('claude', true, en)).toBe('read-only session')
  expect(composerPlaceholder('codex', false, pt)).toContain('Codex')
})
