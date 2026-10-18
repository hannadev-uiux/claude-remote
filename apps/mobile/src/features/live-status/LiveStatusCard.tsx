import { useTranslation } from 'react-i18next'
import { StyleSheet, Switch, View } from 'react-native'
import { space, useTheme } from '@/core/theme'
import { Card, Text } from '@/ui'
import { setLiveStatusEnabled, useLiveStatusSettings } from './settings-store'

/** Turns the lock screen live status of running sessions on or off (on by default). */
export function LiveStatusCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const enabled = useLiveStatusSettings((s) => s.enabled)
  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('liveStatus.title')}</Text>
        <Text size="sm" color="textMuted">
          {t('liveStatus.hint')}
        </Text>
        <View style={styles.row}>
          <Text size="sm" style={styles.flex}>
            {t('liveStatus.enabled')}
          </Text>
          <Switch
            value={enabled}
            onValueChange={(value) => void setLiveStatusEnabled(value)}
            accessibilityLabel={t('liveStatus.enabled')}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
          />
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
})
