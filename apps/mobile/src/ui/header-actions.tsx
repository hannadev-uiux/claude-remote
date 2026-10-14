import type { ReactElement } from 'react'

type HeaderActionsOptions = {
  unstable_headerRightItems: () => Array<{
    type: 'custom'
    element: ReactElement
    hidesSharedBackground: boolean
  }>
}

/**
 * Stack options that render `element` on the right of the header. On iOS 26+ bar buttons share a
 * light "liquid glass" capsule that hides the terminal-colored icons, so the shared background is
 * turned off (older iOS versions ignore the flag).
 */
export function headerActions(element: ReactElement | null): HeaderActionsOptions {
  return {
    unstable_headerRightItems: () =>
      element ? [{ type: 'custom', element, hidesSharedBackground: true }] : [],
  }
}
