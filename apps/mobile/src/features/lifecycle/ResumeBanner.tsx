import type { Session } from '@remote-harness/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { colors, space } from '@/core/theme'
import { Button, Text } from '@/ui'

/** Shown on read-only sessions: reopens them with `claude --resume` in a new tmux window. */
export function ResumeBanner({ session }: { session: Session }) {
  const { t } = useTranslation()
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
      setError(errorMessage(e, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.base}>
      <View style={styles.flex}>
        <Text size="sm">{t('resume.title')}</Text>
        <Text size="xs" color={error ? 'danger' : 'textMuted'}>
          {error ?? (launched ? t('resume.launched') : t('resume.hint'))}
        </Text>
      </View>
      <Button
        label={launched ? t('resume.opening') : t('resume.resume')}
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
