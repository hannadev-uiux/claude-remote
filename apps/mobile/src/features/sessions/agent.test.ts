import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { agentLabel, sessionAgent } from './agent'

describe('agentLabel', () => {
  test('names a known agent by its product name, in every language', () => {
    for (const locale of ['en-US', 'pt-BR', 'es-ES'] as const) {
      const t = createI18n(locale).t
      expect(agentLabel('codex', t)).toBe('Codex')
      expect(agentLabel('claude', t, { sentence: true })).toBe('Claude Code')
    }
  })

  test('falls back to "the agent", capitalized at the start of a sentence', () => {
    const en = createI18n('en-US').t
    expect(en('conversation.placeholder', { agent: agentLabel(null, en) })).toBe('Message the agent…')
    expect(en('permissions.question.title', { agent: agentLabel(null, en, { sentence: true }) })).toBe(
      'The agent has a question',
    )
    const pt = createI18n('pt-BR').t
    expect(pt('conversation.placeholder', { agent: agentLabel(null, pt) })).toBe('Mensagem para o agente…')
    expect(pt('permissions.question.title', { agent: agentLabel('codex', pt, { sentence: true }) })).toBe(
      'Codex tem uma pergunta',
    )
    const es = createI18n('es-ES').t
    expect(es('mode.autoConfirmBody', { agent: agentLabel(null, es, { sentence: true }) })).toMatch(
      /^El agente decidirá/,
    )
  })

  test('the session agent comes from the daemon, Claude Code when an older daemon sends none', () => {
    expect(sessionAgent({ id: 's1' } as Session)).toBe('claude')
    expect(sessionAgent({ id: 's2', agent: 'codex' } as Session)).toBe('codex')
  })
})
