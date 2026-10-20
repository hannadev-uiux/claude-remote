import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import {
  cleanSessionName,
  nameSuggestions,
  profileAgent,
  profileDetail,
  recentDetail,
  worktreeCarryOver,
} from './new-session'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

describe('worktree carry-over', () => {
  test('lists local permissions and the include entries, or hints at .worktreeinclude', () => {
    expect(worktreeCarryOver({ localSettings: true, include: ['.env'] }, en)).toEqual({
      items: ['Local permissions (.claude/settings.local.json)', '.env'],
      hint: null,
    })
    const bare = worktreeCarryOver({ localSettings: false, include: [] }, en)
    expect(bare.items).toEqual([])
    expect(bare.hint).toMatch(/\.worktreeinclude/)
    expect(worktreeCarryOver(undefined, en)).toEqual({ items: [], hint: null })
  })
})

describe('session name', () => {
  test('cleaned before it is sent; empty means no name', () => {
    expect(cleanSessionName('  Rate   limit\non login ')).toBe('Rate limit on login')
    expect(cleanSessionName('   ')).toBeUndefined()
    expect(cleanSessionName('x'.repeat(90))).toHaveLength(80)
  })

  test('suggestions: the branch, then recent session names in that folder', () => {
    const sessions = [
      { cwd: '/w/api', title: 'Rate limit on login', updatedAt: '2026-10-20T10:00:00Z' },
      { cwd: '/w/api', title: 'api', updatedAt: '2026-10-20T11:00:00Z' },
      { cwd: '/w/api/', title: 'Fix CI', updatedAt: '2026-10-20T12:00:00Z' },
      { cwd: '/w/web', title: 'Other folder', updatedAt: '2026-10-20T13:00:00Z' },
      { cwd: '/w/api', title: 'fix/login', updatedAt: '2026-10-19T10:00:00Z' },
    ]
    expect(nameSuggestions('fix/login', sessions, '/w/api')).toEqual([
      'fix/login',
      'Fix CI',
      'Rate limit on login',
    ])
    expect(nameSuggestions('main', sessions, '/w/api')).toEqual([
      'Fix CI',
      'Rate limit on login',
      'fix/login',
    ])
    expect(nameSuggestions(null, [], '/w/api')).toEqual([])
  })
})

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

  test('worktrees folded into a repository row', () => {
    expect(recentDetail({ branch: 'main', sessions: 0, worktrees: 3 }, en)).toBe('⎇ main · 3 worktrees')
    expect(recentDetail({ branch: null, sessions: 0, worktrees: 1 }, en)).toBe('1 worktree')
    expect(recentDetail({ branch: null, sessions: 0, worktrees: 0 }, en)).toBeNull()
  })
})
