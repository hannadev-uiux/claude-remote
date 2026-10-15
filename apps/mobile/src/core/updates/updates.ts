import * as SecureStore from 'expo-secure-store'
import * as Updates from 'expo-updates'
import { create } from 'zustand'
import {
  channelHeaders,
  DEFAULT_CHANNEL,
  isUpdateChannel,
  shouldCheck,
  type UpdateChannel,
  updateChannelOf,
} from './policy'

export type UpdateStatus = 'idle' | 'checking' | 'upToDate' | 'downloaded' | 'error'

type UpdatesState = {
  status: UpdateStatus
  lastCheckedAt: number | null
  /** Daemon version whose "update the computer" banner was dismissed. */
  dismissedDaemonVersion: string | null
  /** Channel the app follows; applied as a request header override before every check. */
  channel: UpdateChannel
}

export const useUpdatesStore = create<UpdatesState>(() => ({
  status: 'idle',
  lastCheckedAt: null,
  dismissedDaemonVersion: null,
  channel: DEFAULT_CHANNEL,
}))

const CHANNEL_KEY = 'claude-remote.update-channel'

/** False in development builds and in builds without an update server. */
export const updatesEnabled = Updates.isEnabled

/** What is running now, for Settings. */
export function runningUpdate() {
  return {
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
    createdAt: Updates.isEmbeddedLaunch ? null : Updates.createdAt,
    /** Channel the running update was published to (null for the built-in bundle). */
    channel: Updates.isEmbeddedLaunch ? null : updateChannelOf(Updates.manifest),
  }
}

/** Loads the chosen channel and applies it; call once before the first check. */
export async function restoreChannel(): Promise<void> {
  const saved = await SecureStore.getItemAsync(CHANNEL_KEY).catch(() => null)
  const channel = isUpdateChannel(saved) ? saved : DEFAULT_CHANNEL
  Updates.setUpdateRequestHeadersOverride(channelHeaders(channel))
  useUpdatesStore.setState({ channel })
}

/**
 * Follows another channel from now on and checks it right away. An update downloaded from the
 * previous channel is set aside by the server's manifest filters (`metadata.channel`).
 */
export async function switchChannel(channel: UpdateChannel): Promise<UpdateStatus> {
  // A check of the previous channel may be running; let it finish so it is not reused.
  await inFlight?.catch(() => undefined)
  await SecureStore.setItemAsync(CHANNEL_KEY, channel)
  Updates.setUpdateRequestHeadersOverride(channelHeaders(channel))
  useUpdatesStore.setState({ channel, status: 'idle' })
  return checkForUpdate({ force: true })
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
  if (state.status === 'downloaded' && !force) return Promise.resolve('downloaded')
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
