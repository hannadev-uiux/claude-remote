import Constants from 'expo-constants'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import {
  checkForUpdate,
  restartIntoUpdate,
  runningUpdate,
  shortUpdateId,
  updatesEnabled,
  useUpdatesStore,
} from '@/core/updates'
import { Button, Card, Text } from '@/ui'

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

/** App version and over-the-air updates: what is running and a manual check. */
export function AppUpdatesCard() {
  const { t, i18n } = useTranslation()
  const status = useUpdatesStore((s) => s.status)
  const running = runningUpdate()

  const restart = () => {
    Alert.alert(t('updates.restartTitle'), t('updates.restartBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('updates.restart'), onPress: () => void restartIntoUpdate() },
    ])
  }

  const message =
    status === 'upToDate'
      ? t('updates.upToDate')
      : status === 'downloaded'
        ? t('updates.downloaded')
        : status === 'error'
          ? t('updates.error')
          : null

  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('updates.title')}</Text>
        <Row label={t('updates.version')} value={Constants.expoConfig?.version ?? '—'} />
        <Row label={t('updates.runtime')} value={running.runtimeVersion?.slice(0, 12) ?? '—'} />
        {updatesEnabled ? (
          <>
            <Row
              label={t('updates.update')}
              value={
                running.updateId && running.createdAt
                  ? `${shortUpdateId(running.updateId)} · ${running.createdAt.toLocaleDateString(i18n.language)}`
                  : t('updates.builtIn')
              }
            />
            {running.channel ? <Row label={t('updates.channel')} value={running.channel} /> : null}
            {message ? (
              <Text size="sm" color={status === 'error' ? 'warning' : 'textMuted'}>
                {message}
              </Text>
            ) : null}
            {status === 'downloaded' ? (
              <Button label={t('updates.restart')} variant="primary" onPress={restart} />
            ) : (
              <Button
                label={t('updates.check')}
                loading={status === 'checking'}
                onPress={() => void checkForUpdate({ force: true })}
              />
            )}
          </>
        ) : (
          <Text size="sm" color="textMuted">
            {t('updates.disabled')}
          </Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
})
