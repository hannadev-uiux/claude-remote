import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * Height of the on-screen keyboard (0 when it is down). iOS reports it as the keyboard starts to
 * move, so views can follow its animation; Android only has the "did" events.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(() => Keyboard.metrics()?.height ?? 0)
  useEffect(() => {
    const ios = Platform.OS === 'ios'
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    )
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return height
}
