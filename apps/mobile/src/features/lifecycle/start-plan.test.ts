import { describe, expect, test, vi } from 'vitest'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import { createI18n } from '@/core/i18n/create'
import { planStart, startErrorMessage, withTimeout } from './start-plan'

const en = createI18n('en-US').t

describe('planStart', () => {
  test('isolated start launches in a worktree without asking', () => {
    expect(planStart({ worktree: true, inCheckout: true, peers: 2 })).toEqual({
      action: 'launch',
      worktree: true,
    })
  })

  test('live sessions in the same checkout ask first', () => {
    expect(planStart({ worktree: false, inCheckout: true, peers: 1 })).toEqual({ action: 'confirm' })
  })

  test('no peers or no inspection launches in place', () => {
    expect(planStart({ worktree: false, inCheckout: true, peers: 0 })).toEqual({
      action: 'launch',
      worktree: false,
    })
    expect(planStart({ worktree: false, inCheckout: false, peers: 0 })).toEqual({
      action: 'launch',
      worktree: false,
    })
  })

  test('worktree switch outside a checkout is ignored', () => {
    expect(planStart({ worktree: true, inCheckout: false, peers: 0 })).toEqual({
      action: 'launch',
      worktree: false,
    })
  })
})

describe('withTimeout', () => {
  test('resolves with the value when it arrives in time', async () => {
    await expect(withTimeout(Promise.resolve(1), 50, null)).resolves.toBe(1)
  })

  test('falls back on rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('unknown_type')), 50, null)).resolves.toBeNull()
  })

  test('falls back when the reply never comes', async () => {
    vi.useFakeTimers()
    const result = withTimeout(new Promise(() => {}), 3_000, 'fallback')
    vi.advanceTimersByTime(3_000)
    await expect(result).resolves.toBe('fallback')
    vi.useRealTimers()
  })
})

describe('startErrorMessage', () => {
  test('explains each start failure', () => {
    expect(startErrorMessage(new DaemonRequestError('invalid_cwd', 'x'), en)).toMatch(/outside your home/)
    expect(startErrorMessage(new DaemonRequestError('not_found', 'x'), en)).toMatch(/profile/)
    expect(startErrorMessage(new DaemonRequestError('internal', 'Claude Code exited'), en)).toBe(
      'Could not open the agent in tmux: Claude Code exited',
    )
    expect(startErrorMessage(new DaemonRequestError('timeout', 'x'), en)).toBe('The daemon did not respond.')
  })
})
