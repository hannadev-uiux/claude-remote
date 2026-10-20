import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { TextInput } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { keys, onKeyCommand } from '@/core/keyboard/key-commands'
import type { LayoutClass } from '@/core/layout'
import { setInspectorOpen, setInspectorTab } from '@/features/inspector/store'
import { hasSwitchableModes } from '@/features/mode/modes'
import { buildRespond } from '@/features/permissions/describe'
import { usePermissionsStore } from '@/features/permissions/store'
import { listSessions, NO_FILTER } from '@/features/sessions/filter'
import { useSessionPrefsStore } from '@/features/sessions/prefs-store'
import { requestSearchFocus } from '@/features/sessions/search-focus'
import { useSessionSortStore } from '@/features/sessions/sort-store'
import { useSessionsStore } from '@/features/sessions/store'
import { adjacentSessionId, cycleMode, nthSessionId } from './logic'
import { requestComposerFocus, requestSessionMenu } from './store'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/** The list in the order the user sees it (saved sort and pins, no filter). */
function listedSessionIds(): string[] {
  const sessions = Object.values(useSessionsStore.getState().sessions)
  const { sort } = useSessionSortStore.getState()
  return listSessions(sessions, NO_FILTER, sort, useSessionPrefsStore.getState()).map((s) => s.id)
}

/** The oldest pending tool permission of a session (questions and plans are answered in the app). */
function oldestToolPermission(sessionId: string) {
  return Object.values(usePermissionsStore.getState().pending)
    .filter((p) => p.sessionId === sessionId && !p.interaction)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
}

/**
 * Hardware keyboard shortcuts of the shell: ⌘1–9 open the nth session, ⌘K / ⌘F focus the search,
 * ⌘T opens the terminal (the inspector's tab on tablets), ⌘. sends Esc, ⌘⇧M cycles the permission
 * mode, ⌘A / ⌘D answer the oldest pending tool permission, ⌘↑ / ⌘↓ (⌥⌘↑ / ⌥⌘↓) step to the
 * previous / next session, ⌘⇧O opens the session's More options and ⌘L focuses its composer.
 * ⌘A, ⌘D, ⌘↑ and ⌘↓ never act while typing. Stores are read when a key fires, so the listeners are
 * registered once.
 */
export function useSessionShortcuts(selectedSessionId: string | null, layout: LayoutClass): void {
  const selected = useRef(selectedSessionId)
  selected.current = selectedSessionId
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    const cmd = keys.keyModifierCommand
    const client = () => useConnectionStore.getState().client
    const typing = () => TextInput.State.currentlyFocusedInput() != null
    const openSession = (id: string) => router.push({ pathname: '/session/[id]', params: { id } })

    const answer = (decision: 'allow' | 'deny') => {
      const id = selected.current
      const c = client()
      if (!id || !c || typing()) return
      const request = oldestToolPermission(id)
      if (request) c.request(buildRespond(request.requestId, decision)).catch(() => undefined)
    }

    const focusSearch = () => {
      if (layoutRef.current === 'compact') router.navigate('/')
      requestSearchFocus()
    }

    // Replaces the open session, so back still returns to the list.
    const step = (delta: 1 | -1, whileTyping: boolean) => () => {
      if (!whileTyping && typing()) return
      const id = adjacentSessionId(listedSessionIds(), selected.current, delta)
      if (id) router.replace({ pathname: '/session/[id]', params: { id } })
    }

    const withSession = (action: () => void) => () => {
      if (selected.current) action()
    }

    // Android has no Option modifier: registering ⌥⌘ there would listen to the bare arrows.
    const optionCmd = keys.keyModifierOptionCommand as number | undefined

    const unsubscribers = [
      ...DIGITS.map((digit) =>
        onKeyCommand({ input: digit, modifierFlags: cmd }, () => {
          const id = nthSessionId(listedSessionIds(), Number(digit))
          if (id) openSession(id)
        }),
      ),
      onKeyCommand({ input: 'k', modifierFlags: cmd }, focusSearch),
      onKeyCommand({ input: 'f', modifierFlags: cmd }, focusSearch),
      onKeyCommand({ input: 't', modifierFlags: cmd }, () => {
        const id = selected.current
        if (!id) return
        if (layoutRef.current === 'compact') {
          router.push({ pathname: '/session/[id]/terminal', params: { id } })
          return
        }
        setInspectorTab('terminal')
        setInspectorOpen(true)
      }),
      onKeyCommand({ input: '.', modifierFlags: cmd }, () => {
        const id = selected.current
        if (id) client()?.send({ type: 'session.key', sessionId: id, key: 'Escape' })
      }),
      onKeyCommand({ input: 'm', modifierFlags: cmd | keys.keyModifierShift }, () => {
        const id = selected.current
        const c = client()
        if (!id || !c) return
        const session = useSessionsStore.getState().sessions[id]
        if (!session?.controllable || !hasSwitchableModes(session.agent ?? null)) return
        c.request({ type: 'session.setMode', sessionId: id, mode: cycleMode(session.permissionMode) }).catch(
          () => undefined,
        )
      }),
      onKeyCommand({ input: 'a', modifierFlags: cmd }, () => answer('allow')),
      onKeyCommand({ input: 'd', modifierFlags: cmd }, () => answer('deny')),
      onKeyCommand({ input: keys.keyInputUpArrow, modifierFlags: cmd }, step(-1, false)),
      onKeyCommand({ input: keys.keyInputDownArrow, modifierFlags: cmd }, step(1, false)),
      ...(optionCmd
        ? [
            onKeyCommand({ input: keys.keyInputUpArrow, modifierFlags: optionCmd }, step(-1, true)),
            onKeyCommand({ input: keys.keyInputDownArrow, modifierFlags: optionCmd }, step(1, true)),
          ]
        : []),
      onKeyCommand(
        { input: 'o', modifierFlags: cmd | keys.keyModifierShift },
        withSession(requestSessionMenu),
      ),
      onKeyCommand({ input: 'l', modifierFlags: cmd }, withSession(requestComposerFocus)),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [])
}
