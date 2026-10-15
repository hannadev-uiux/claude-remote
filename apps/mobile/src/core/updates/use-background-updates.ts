import { useEffect } from 'react'
import { AppState } from 'react-native'
import { checkForUpdate, updatesEnabled } from './updates'

/** Checks at launch and when the app comes back to the foreground (throttled). */
export function useBackgroundUpdates(): void {
  useEffect(() => {
    if (!updatesEnabled) return
    void checkForUpdate({ force: true })
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate()
    })
    return () => subscription.remove()
  }, [])
}
