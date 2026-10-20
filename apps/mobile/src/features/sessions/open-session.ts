import { router } from 'expo-router'
import { openSessionMode } from './session-navigation'

/** The current path of the main stack, kept by its layout (rows do not each subscribe to it). */
let currentPathname = '/'

export function trackPathname(pathname: string): void {
  currentPathname = pathname
}

/** Shows a session's conversation without piling conversations up in the stack. */
export function openSession(sessionId: string): void {
  const href = { pathname: '/session/[id]', params: { id: sessionId } } as const
  switch (openSessionMode(currentPathname, sessionId)) {
    case 'stay':
      return
    case 'replace':
      router.replace(href)
      return
    case 'push':
      router.push(href)
  }
}
