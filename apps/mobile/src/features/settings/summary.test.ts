import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { machineMeta, mutedSummary } from './summary'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

describe('machineMeta', () => {
  test('joins host, daemon version and protocol, leaving unknown parts out', () => {
    expect(
      machineMeta({ host: '100.101.1.7', port: 7788, daemonVersion: '0.11.0', protocolVersion: 9 }, en),
    ).toBe('100.101.1.7:7788 · remote-harness 0.11.0 · protocol 9')
    expect(machineMeta({ host: '100.101.1.7', port: 7788 }, en)).toBe('100.101.1.7:7788')
    expect(machineMeta({ daemonVersion: '0.11.0', protocolVersion: 9 }, pt)).toBe(
      'remote-harness 0.11.0 · protocolo 9',
    )
    expect(machineMeta({}, en)).toBe('')
  })
})

describe('mutedSummary', () => {
  test('counts profiles and sessions, or says nothing is muted', () => {
    expect(mutedSummary({ profiles: 1, sessions: 2 }, en)).toBe('1 profile · 2 sessions')
    expect(mutedSummary({ profiles: 0, sessions: 1 }, en)).toBe('1 session')
    expect(mutedSummary({ profiles: 2, sessions: 0 }, pt)).toBe('2 perfis')
    expect(mutedSummary({ profiles: 0, sessions: 0 }, en)).toBe('nothing muted')
  })
})
