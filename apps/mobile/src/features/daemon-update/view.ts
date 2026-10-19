import type { DaemonUpdateBlocker, DaemonUpdateInfo, DaemonUpdateRun } from '@remote-harness/protocol'

export type RunningStep = 'fetching' | 'building' | 'restarting'

/** What the Daemon card shows as its main state. */
export type DaemonUpdatePhase =
  | { kind: 'unsupported' }
  | { kind: 'loading' }
  | { kind: 'blocked'; reason: DaemonUpdateBlocker }
  | { kind: 'running'; step: RunningStep; index: 1 | 2 | 3 }
  | { kind: 'checking' }
  | { kind: 'available'; label: string; downgrade: boolean }
  | { kind: 'upToDate' }

const STEP_INDEX: Record<RunningStep, 1 | 2 | 3> = { fetching: 1, building: 2, restarting: 3 }

/** Version of an available update, with the short commit when the number did not change. */
export function availableLabel(
  available: { version: string | null; commit: string },
  current: string,
): string {
  const commit = available.commit.slice(0, 7)
  if (!available.version) return commit
  return available.version === current ? `${available.version} (${commit})` : available.version
}

/**
 * The card's state. `restarting` stays while the app is disconnected: the daemon that answers next
 * reports the run as done.
 */
export function daemonUpdatePhase(info: DaemonUpdateInfo | null, supported: boolean): DaemonUpdatePhase {
  if (!supported) return { kind: 'unsupported' }
  if (!info) return { kind: 'loading' }
  if (info.blocked) return { kind: 'blocked', reason: info.blocked }
  const step = info.run?.step
  if (step === 'fetching' || step === 'building' || step === 'restarting')
    return { kind: 'running', step, index: STEP_INDEX[step] }
  if (info.checking) return { kind: 'checking' }
  if (info.available)
    return {
      kind: 'available',
      label: availableLabel(info.available, info.current),
      downgrade: info.available.downgrade,
    }
  return { kind: 'upToDate' }
}

/** Runs finished longer ago than this are not mentioned any more. */
export const RUN_NOTE_MS = 24 * 60 * 60 * 1000

/** Outcome of the last run worth telling: a new version installed, or a failure. */
export type RunNote =
  | { kind: 'updated'; version: string }
  | { kind: 'failed'; error: string; rolledBack: boolean; version: string }

export function runNote(run: DaemonUpdateRun | null, current: string, now: number): RunNote | null {
  if (!run?.finishedAt || now - Date.parse(run.finishedAt) > RUN_NOTE_MS) return null
  if (run.step === 'failed')
    return { kind: 'failed', error: run.error ?? '', rolledBack: run.rolledBack === true, version: run.from }
  if (run.step === 'done' && run.to === current && run.from !== current)
    return { kind: 'updated', version: current }
  return null
}

/** What the confirmation must warn about before updating. */
export function confirmationWarnings(info: DaemonUpdateInfo): { older: boolean; busy: boolean } {
  return { older: info.available?.downgrade === true, busy: info.busy }
}
