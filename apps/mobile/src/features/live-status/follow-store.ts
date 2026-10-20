import { create } from 'zustand'

/**
 * What this phone follows on the connected daemon (the last `live.followed`), whether the daemon
 * can follow at all, and the iOS push-to-start token sent with every follow message. `loaded`
 * turns true once the daemon answered (or cannot follow).
 */
export const useLiveFollowStore = create<{
  supported: boolean
  loaded: boolean
  sessionIds: string[]
  autoFollowProfiles: string[]
  startToken: string | null
}>(() => ({ supported: false, loaded: false, sessionIds: [], autoFollowProfiles: [], startToken: null }))

export function setFollowed(followed: { sessionIds: string[]; autoFollowProfiles: string[] }): void {
  useLiveFollowStore.setState({
    loaded: true,
    sessionIds: followed.sessionIds,
    autoFollowProfiles: followed.autoFollowProfiles,
  })
}

/**
 * Resolves once the follows are known, or after `timeoutMs`: matching the activities iOS has must
 * not end one the daemon started for a followed session just because the answer is still on its way.
 */
export function followsLoaded(timeoutMs: number): Promise<void> {
  if (useLiveFollowStore.getState().loaded) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      unsubscribe()
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    const unsubscribe = useLiveFollowStore.subscribe((state) => {
      if (state.loaded) done()
    })
  })
}
