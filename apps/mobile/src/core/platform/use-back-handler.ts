import { useEffect, useRef } from 'react'
import { BackHandler } from 'react-native'

/**
 * Android hardware back: while `active`, back runs `onBack` (e.g. closes a sheet or a suggestion
 * list) instead of leaving the screen. The latest handler registered wins, so nested overlays close
 * from the top. `Modal`s get back through `onRequestClose` instead. No-op on iOS.
 */
export function useBackHandler(active: boolean, onBack: () => void) {
  const handler = useRef(onBack)
  handler.current = onBack
  useEffect(() => {
    if (!active) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handler.current()
      return true
    })
    return () => sub.remove()
  }, [active])
}
