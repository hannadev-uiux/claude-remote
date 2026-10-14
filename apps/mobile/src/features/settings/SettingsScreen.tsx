import Constants from 'expo-constants'
import { router } from 'expo-router'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { credentialsStorage } from '@/core/storage/credentials'
import { space } from '@/core/theme'
import { Badge, Button, Card, Screen, Text } from '@/ui'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text size="sm" color="textMuted">
        {label}
      </Text>
      <Text size="sm" selectable>
        {value}
      </Text>
    </View>
  )
}

export function SettingsScreen({ children }: { children?: React.ReactNode }) {
  const credentials = useConnectionStore((s) => s.credentials)
  const hello = useConnectionStore((s) => s.hello)
  const status = useConnectionStore((s) => s.status)
  const setCredentials = useConnectionStore((s) => s.setCredentials)

  const forget = () => {
    Alert.alert('Esquecer daemon?', 'O token será apagado deste aparelho. Você precisará parear de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Esquecer',
        style: 'destructive',
        onPress: async () => {
          await credentialsStorage.clear()
          setCredentials(null)
          router.replace('/pair')
        },
      },
    ])
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.gap}>
            <View style={styles.title}>
              <Text weight="bold">Daemon</Text>
              <Badge
                label={status === 'open' ? 'conectado' : status}
                tone={status === 'open' ? 'success' : 'warning'}
                dot
              />
            </View>
            <Row label="host" value={credentials ? `${credentials.host}:${credentials.port}` : '—'} />
            <Row label="versão" value={hello?.daemonVersion ?? '—'} />
            <Row label="protocolo" value={hello ? String(hello.protocolVersion) : '—'} />
          </View>
        </Card>

        <Card>
          <View style={styles.gap}>
            <Text weight="bold">Perfis</Text>
            {(hello?.profiles ?? []).map((p) => (
              <View key={p.id} style={styles.title}>
                <Text size="sm" style={{ color: p.color }}>
                  ● {p.name}
                </Text>
                <Text size="xs" color="textMuted">
                  {p.id}
                </Text>
              </View>
            ))}
            {hello && hello.profiles.length === 0 ? (
              <Text size="sm" color="textMuted">
                Nenhum perfil encontrado no Mac.
              </Text>
            ) : null}
          </View>
        </Card>

        {children}

        <Button label="Esquecer daemon" variant="danger" onPress={forget} />
        <Text size="xs" color="textDim" style={styles.center}>
          Claude Remote {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  gap: { gap: space.sm },
  title: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  center: { textAlign: 'center' },
})
