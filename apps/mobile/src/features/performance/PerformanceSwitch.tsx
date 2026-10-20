import { useTranslation } from 'react-i18next'
import { Switch, View } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'
import { Text } from '@/ui'
import { setPerformanceEnabled, usePerformanceSettings } from './store'

/** "Send performance data" (off by default), under Settings → Error reports in Firebase builds. */
export function PerformanceSwitch() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const enabled = usePerformanceSettings((s) => s.enabled)
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text size="sm">{t('errorReports.performance')}</Text>
        <Text size="xs" color="textMuted">
          {t('errorReports.performanceHint')}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(value) => void setPerformanceEnabled(value)}
        accessibilityLabel={t('errorReports.performance')}
        trackColor={{ true: colors.accent, false: colors.borderStrong }}
      />
    </View>
  )
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
}))
