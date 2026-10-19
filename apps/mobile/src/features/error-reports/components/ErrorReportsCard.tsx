import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Button, Card, Text } from '@/ui'
import { firebaseInBuild } from '../crashlytics'
import { useErrorReportsStore } from '../store'
import { PreferenceChoice } from './PreferenceChoice'

/** Settings → Error reports: the consent choice and "Report a problem". */
export function ErrorReportsCard() {
  const { t } = useTranslation()
  const count = useErrorReportsStore((s) => s.entries.length)
  const firebase = firebaseInBuild()
  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('errorReports.title')}</Text>
        <Text size="xs" color="textMuted">
          {t('errorReports.hint')}
        </Text>
        {firebase ? (
          <PreferenceChoice />
        ) : (
          <Text size="xs" color="textMuted">
            {t('errorReports.unavailable')}
          </Text>
        )}
        <Text size="xs" color="textDim">
          {t('errorReports.recorded', { count })}
        </Text>
        <Button label={t('settings.reportProblem')} onPress={() => router.push('/report')} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({ gap: { gap: space.sm } })
