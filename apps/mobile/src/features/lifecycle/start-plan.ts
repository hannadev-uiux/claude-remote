import { DaemonRequestError } from '../../core/connection/daemon-client'
import { errorMessage } from '../../core/connection/error-message'
import type { TFunction } from '../../core/i18n/create'
import { agentLabel } from '../sessions/agent'

export type StartPlan = { action: 'launch'; worktree: boolean } | { action: 'confirm' }

/** How long a tap on Start waits for the directory inspection before launching without it. */
export const INSPECT_BEFORE_START_MS = 3_000

/**
 * What tapping Start does: an isolated start (worktree on, inside a checkout) launches right away;
 * otherwise live sessions in the same checkout ask first. Without an inspection (older daemon,
 * failure or timeout) there is nothing to warn about.
 */
export function planStart({
  worktree,
  inCheckout,
  peers,
}: {
  worktree: boolean
  inCheckout: boolean
  peers: number
}): StartPlan {
  if (worktree && inCheckout) return { action: 'launch', worktree: true }
  return peers > 0 ? { action: 'confirm' } : { action: 'launch', worktree: false }
}

/** `promise`, or `fallback` when it rejects or takes longer than `ms`. */
export function withTimeout<T, F>(promise: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

/** Text shown under Start when `session.start` fails. */
export function startErrorMessage(error: unknown, t: TFunction): string {
  return errorMessage(error, t, {
    invalid_cwd: t('newSession.errors.invalidCwd'),
    not_found: t('newSession.errors.profileNotFound'),
    ...(error instanceof DaemonRequestError
      ? {
          internal: t('newSession.errors.launchFailed', {
            agent: agentLabel(null, t),
            reason: error.message,
          }),
        }
      : {}),
  })
}
