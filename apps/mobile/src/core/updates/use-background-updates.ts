import { useEffect } from 'react'
import { AppState } from 'react-native'
import { checkForUpdate, restoreChannel, updatesEnabled } from './updates'

/** Checks at launch and when the app comes back to the foreground (throttled). */
export function useBackgroundUpdates(): void {
  useEffect(() => {
    if (!updatesEnabled) return
    // The channel override is not assumed to survive a restart: apply it before the first check.
    void restoreChannel()
      .catch(() => undefined)
      .then(() => checkForUpdate({ force: true }))
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate()
    })
    return () => subscription.remove()
  }, [])
}
