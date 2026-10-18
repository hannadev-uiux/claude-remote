import { Bell, BellOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, Switch, View } from 'react-native'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import type { TFunction } from '@/core/i18n/create'
import { space, useTheme } from '@/core/theme'
import { Card, IconButton, Text } from '@/ui'
import { setMuted, useMuteStore } from './store'

function toggle(
  client: ReturnType<typeof useDaemonClient>,
  target: 'profile' | 'session',
  id: string,
  muted: boolean,
  t: TFunction,
) {
  if (!client) return
  setMuted(client, target, id, muted).catch((e: unknown) =>
    Alert.alert(t('mute.changeFailed'), errorMessage(e, t)),
  )
}

/** Per-profile switches for the settings screen. */
export function ProfileMuteCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const client = useDaemonClient()
  const profiles = useConnectionStore(selectProfiles)
  const mutedProfiles = useMuteStore((s) => s.profiles)
  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('mute.notifications')}</Text>
        {profiles.map((p) => {
          const muted = mutedProfiles.includes(p.id)
          return (
            <View key={p.id} style={styles.row}>
              <Text size="sm" style={{ color: p.color }}>
                {p.name}
              </Text>
              <Switch
                value={!muted}
                onValueChange={(on) => toggle(client, 'profile', p.id, !on, t)}
                trackColor={{ true: colors.accent, false: colors.borderStrong }}
              />
            </View>
          )
        })}
      </View>
    </Card>
  )
}

/** Bell toggle for the session header. */
export function SessionMuteButton({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation()
  const client = useDaemonClient()
  const muted = useMuteStore((s) => s.sessions.includes(sessionId))
  return (
    <IconButton
      icon={muted ? BellOff : Bell}
      label={muted ? t('mute.unmute') : t('mute.mute')}
      color={muted ? 'textDim' : 'textMuted'}
      onPress={() => toggle(client, 'session', sessionId, !muted, t)}
    />
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
