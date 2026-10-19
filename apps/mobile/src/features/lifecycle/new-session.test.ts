import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { profileAgent, profileDetail, recentDetail } from './new-session'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

describe('profile rows', () => {
  test('the profile agent comes from the daemon, Claude Code when it sends none', () => {
    expect(profileAgent({ id: 'work' })).toBe('claude')
    expect(profileAgent({ id: 'codex', agent: 'codex' })).toBe('codex')
  })

  test('detail is agent · config dir, plus the provider when given', () => {
    const profile = { id: 'p', configDir: '/Users/me/.claude-work' }
    expect(profileDetail(profile)).toBe('Claude Code · ~/.claude-work')
    expect(profileDetail(profile, 'gateway')).toBe('Claude Code · ~/.claude-work · gateway')
  })
})

describe('recentDetail', () => {
  test('branch and weekly usage, each only when known', () => {
    expect(recentDetail({ branch: 'main', sessions: 2 }, en)).toBe('⎇ main · 2 sessions this week')
    expect(recentDetail({ branch: 'fix/onboarding', sessions: 0 }, en)).toBe('⎇ fix/onboarding')
    expect(recentDetail({ branch: null, sessions: 1 }, en)).toBe('1 session this week')
    expect(recentDetail({ branch: null, sessions: 0 }, en)).toBeNull()
    expect(recentDetail({ branch: null, sessions: 3 }, pt)).toBe('3 sessões esta semana')
  })
})
