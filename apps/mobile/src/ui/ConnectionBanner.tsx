import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Text } from './Text'

const LABELS = {
  connecting: 'conectando ao daemon…',
  authenticating: 'autenticando…',
  reconnecting: 'reconectando…',
  unauthorized: 'token recusado — pareie novamente',
  closed: 'desconectado',
} as const

/** Thin status strip shown whenever the socket is not open. */
export function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status)
  const credentials = useConnectionStore((s) => s.credentials)
  if (!credentials || status === 'open' || status === 'idle') return null
  const danger = status === 'unauthorized'
  return (
    <View style={[styles.base, { backgroundColor: danger ? colors.dangerMuted : colors.warningMuted }]}>
      <Text size="xs" color={danger ? 'danger' : 'warning'}>
        ● {LABELS[status]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({ base: { paddingVertical: space.xs, paddingHorizontal: space.lg } })
