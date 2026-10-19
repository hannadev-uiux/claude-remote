import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space, useTheme } from '@/core/theme'
import { Text } from './Text'

/** Thin status strip shown whenever the socket is not open. */
export function ConnectionBanner() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const credentials = useConnectionStore((s) => s.credentials)
  if (!credentials || status === 'open' || status === 'idle') return null
  const danger = status === 'unauthorized'
  return (
    <View style={[styles.base, { backgroundColor: danger ? colors.dangerSoft : colors.warningSoft }]}>
      <Text size="xs" color={danger ? 'danger' : 'warning'}>
        ● {t(`connection.banner.${status}`)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({ base: { paddingVertical: space.xs, paddingHorizontal: space.lg } })
