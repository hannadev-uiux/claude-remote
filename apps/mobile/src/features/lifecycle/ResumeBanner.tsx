import type { Session } from '@claude-remote/protocol'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Button, Text } from '@/ui'

/** Shown on read-only sessions: reopens them with `claude --resume` in a new tmux window. */
export function ResumeBanner({ session }: { session: Session }) {
  const client = useDaemonClient()
  const [busy, setBusy] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (session.controllable) return null

  const resume = async () => {
    if (!client) return
    setBusy(true)
    setError(null)
    try {
      await client.request({ type: 'session.resume', profileId: session.profileId, sessionId: session.id })
      setLaunched(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.base}>
      <View style={styles.flex}>
        <Text size="sm">Sessão somente leitura</Text>
        <Text size="xs" color={error ? 'danger' : 'textMuted'}>
          {error ??
            (launched
              ? 'Abrindo no tmux do Mac. Se demorar, veja o terminal.'
              : 'Retome para continuar no tmux do Mac.')}
        </Text>
      </View>
      <Button
        label={launched ? 'Abrindo…' : 'Retomar'}
        variant="primary"
        compact
        loading={busy}
        disabled={launched}
        onPress={() => void resume()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  flex: { flex: 1 },
})
