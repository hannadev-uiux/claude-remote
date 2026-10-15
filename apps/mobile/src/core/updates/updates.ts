import * as Updates from 'expo-updates'
import { create } from 'zustand'
import { shouldCheck } from './policy'

export type UpdateStatus = 'idle' | 'checking' | 'upToDate' | 'downloaded' | 'error'

type UpdatesState = {
  status: UpdateStatus
  lastCheckedAt: number | null
  /** Daemon version whose "update the computer" banner was dismissed. */
  dismissedDaemonVersion: string | null
}

export const useUpdatesStore = create<UpdatesState>(() => ({
  status: 'idle',
  lastCheckedAt: null,
  dismissedDaemonVersion: null,
}))

/** False in development builds and in builds without an update server. */
export const updatesEnabled = Updates.isEnabled

/** What is running now, for Settings. */
export function runningUpdate() {
  return {
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
    createdAt: Updates.isEmbeddedLaunch ? null : Updates.createdAt,
    channel: Updates.channel,
  }
}

let inFlight: Promise<UpdateStatus> | null = null

async function checkAndFetch(): Promise<UpdateStatus> {
  try {
    const check = await Updates.checkForUpdateAsync()
    if (!check.isAvailable && !check.isRollBackToEmbedded) return 'upToDate'
    const fetched = await Updates.fetchUpdateAsync()
    return fetched.isNew || fetched.isRollBackToEmbedded ? 'downloaded' : 'upToDate'
  } catch (error) {
    // Offline or server down: the current bundle keeps working.
    console.warn('[updates] check failed', error)
    return 'error'
  }
}

/**
 * Checks and downloads in the background; the update applies on the next cold start (or `restart`).
 * `force` skips the foreground throttle (Settings button). Concurrent calls share one check.
 */
export function checkForUpdate({ force = false } = {}): Promise<UpdateStatus> {
  const state = useUpdatesStore.getState()
  if (!updatesEnabled) return Promise.resolve(state.status)
  if (state.status === 'downloaded') return Promise.resolve('downloaded')
  if (inFlight) return inFlight
  const now = Date.now()
  if (!force && !shouldCheck(state.lastCheckedAt, now)) return Promise.resolve(state.status)
  useUpdatesStore.setState({ status: 'checking', lastCheckedAt: now })
  inFlight = checkAndFetch().then((status) => {
    useUpdatesStore.setState({ status })
    inFlight = null
    return status
  })
  return inFlight
}

/** Restarts into the downloaded update. Only from an explicit user action. */
export function restartIntoUpdate(): Promise<void> {
  return Updates.reloadAsync()
}
