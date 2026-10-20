import { useTranslation } from 'react-i18next'
import { Switch, View } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'
import { setAutocorrect, useAutocorrectSettings } from '@/features/conversation/autocorrect-store'
import { setReturnSends, useReturnKeySettings } from '@/features/conversation/return-key-store'
import { Card, Text } from '@/ui'

/** Settings → Keyboard: "Return key sends" (off by default) and autocorrect in the message input (on). */
export function KeyboardCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const sends = useReturnKeySettings((s) => s.sends)
  const autocorrect = useAutocorrectSettings((s) => s.enabled)
  return (
    <Card>
      <Text weight="bold">{t('settings.keyboardCard')}</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text size="sm">{t('settings.returnSends')}</Text>
          <Text size="xs" color="textMuted">
            {t('settings.returnSendsHint')}
          </Text>
        </View>
        <Switch
          value={sends}
          onValueChange={(value) => void setReturnSends(value)}
          accessibilityLabel={t('settings.returnSends')}
          trackColor={{ true: colors.accent, false: colors.borderStrong }}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text size="sm">{t('settings.autocorrect')}</Text>
          <Text size="xs" color="textMuted">
            {t('settings.autocorrectHint')}
          </Text>
        </View>
        <Switch
          value={autocorrect}
          onValueChange={(value) => void setAutocorrect(value)}
          accessibilityLabel={t('settings.autocorrect')}
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
