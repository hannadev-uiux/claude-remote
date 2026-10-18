import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { profileAgent, profileDetail, recentDetail } from './new-session'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

describe('profile rows', () => {
  test('every profile launches Claude Code until the protocol says otherwise', () => {
    expect(profileAgent({ id: 'work' })).toBe('claude')
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
