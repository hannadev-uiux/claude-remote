import { Bell, BellOff } from 'lucide-react-native'
import { Alert, StyleSheet, Switch, View } from 'react-native'
import { useConnectionStore, useDaemonClient } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Card, IconButton, Text } from '@/ui'
import { setMuted, useMuteStore } from './store'

function toggle(
  client: ReturnType<typeof useDaemonClient>,
  target: 'profile' | 'session',
  id: string,
  muted: boolean,
) {
  if (!client) return
  setMuted(client, target, id, muted).catch((e: Error) => Alert.alert('Não foi possível alterar', e.message))
}

/** Per-profile switches for the settings screen. */
export function ProfileMuteCard() {
  const client = useDaemonClient()
  const profiles = useConnectionStore((s) => s.hello?.profiles ?? [])
  const mutedProfiles = useMuteStore((s) => s.profiles)
  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">Notificações</Text>
        {profiles.map((p) => {
          const muted = mutedProfiles.includes(p.id)
          return (
            <View key={p.id} style={styles.row}>
              <Text size="sm" style={{ color: p.color }}>
                {p.name}
              </Text>
              <Switch
                value={!muted}
                onValueChange={(on) => toggle(client, 'profile', p.id, !on)}
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
  const client = useDaemonClient()
  const muted = useMuteStore((s) => s.sessions.includes(sessionId))
  return (
    <IconButton
      icon={muted ? BellOff : Bell}
      label={muted ? 'Reativar notificações' : 'Silenciar notificações'}
      color={muted ? 'textDim' : 'textMuted'}
      onPress={() => toggle(client, 'session', sessionId, !muted)}
    />
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
