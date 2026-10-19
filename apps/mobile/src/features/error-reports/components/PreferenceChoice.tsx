import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Button } from '@/ui'
import { setReportPreference } from '../capture'
import { REPORT_PREFERENCES } from '../consent'
import { useErrorReportsStore } from '../store'

/** Send automatically / Ask each time / Never. */
export function PreferenceChoice() {
  const { t } = useTranslation()
  const preference = useErrorReportsStore((s) => s.preference)
  return (
    <View style={styles.chips}>
      {REPORT_PREFERENCES.map((p) => (
        <Button
          key={p}
          label={t(`errorReports.preferences.${p}`)}
          compact
          variant={preference === p ? 'primary' : 'secondary'}
          onPress={() => void setReportPreference(p)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } })
