import { useTranslation } from 'react-i18next'
import { Switch, View } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'
import { setOpenAfterCreate, useOpenAfterCreateSettings } from '@/features/lifecycle/open-after-create-store'
import { Card, Text } from '@/ui'

/** Settings → New session: the "Open the session after creating it" toggle, on by default. */
export function NewSessionCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const enabled = useOpenAfterCreateSettings((s) => s.enabled)
  return (
    <Card>
      <Text weight="bold">{t('settings.newSessionCard')}</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text size="sm">{t('settings.openAfterCreate')}</Text>
          <Text size="xs" color="textMuted">
            {t('settings.openAfterCreateHint')}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(value) => void setOpenAfterCreate(value)}
          accessibilityLabel={t('settings.openAfterCreate')}
          trackColor={{ true: colors.accent, false: colors.borderStrong }}
        />
      </View>
    </Card>
  )
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 },
}))
