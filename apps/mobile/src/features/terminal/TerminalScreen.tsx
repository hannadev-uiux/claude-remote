import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useDaemonClient, useDaemonEvent } from '@/core/connection'
import { space } from '@/core/theme'
import { ConnectionBanner, Screen, Text } from '@/ui'
import { DEFAULT_KEYS, KeyBar } from '../conversation/components/KeyBar'
import { TerminalView, type TerminalViewHandle } from './TerminalView'

const TERMINAL_KEYS = [
  ...DEFAULT_KEYS,
  ...(['4', '5', '6', '7', '8', '9'] as const).map((key) => ({ key, label: key })),
  { key: 'Space' as const, label: 'espaço' },
  { key: 'BSpace' as const, label: '⌫' },
]

/** Live mirror of the session's tmux pane, for TUI menus and dialogs the transcript can't show. */
export function TerminalScreen({ sessionId }: { sessionId: string }) {
  const client = useDaemonClient()
  const terminal = useRef<TerminalViewHandle>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFrame = useRef<{ text: string; cols: number; rows: number } | null>(null)

  useDaemonEvent('pane.frame', (frame) => {
    if (frame.sessionId !== sessionId) return
    lastFrame.current = frame
    if (ready) terminal.current?.render(frame)
  })

  useEffect(() => {
    if (ready && lastFrame.current) terminal.current?.render(lastFrame.current)
  }, [ready])

  useEffect(() => {
    if (!client) return
    const subscribe = () => {
      client.request({ type: 'pane.subscribe', sessionId }).then(
        () => setError(null),
        (e: Error) => setError(e.message),
      )
    }
    const off = client.onReady(subscribe)
    if (client.status === 'open') subscribe()
    return () => {
      off()
      client.send({ type: 'pane.unsubscribe', sessionId })
    }
  }, [client, sessionId])

  return (
    <Screen>
      <ConnectionBanner />
      {error ? (
        <Text size="sm" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.flex}>
        <TerminalView ref={terminal} onReady={() => setReady(true)} />
      </View>
      <KeyBar keys={TERMINAL_KEYS} onKey={(key) => client?.send({ type: 'session.key', sessionId, key })} />
    </Screen>
  )
}

const styles = StyleSheet.create({ flex: { flex: 1 }, error: { padding: space.md } })
