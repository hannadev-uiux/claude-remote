import Constants from 'expo-constants'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import {
  checkForUpdate,
  restartIntoUpdate,
  runningUpdate,
  shortUpdateId,
  switchChannel,
  UPDATE_CHANNELS,
  type UpdateChannel,
  updatesEnabled,
  useUpdatesStore,
} from '@/core/updates'
import { Button, Card, Text } from '@/ui'

const DOCS_URL = 'https://remoteharness.app/docs'

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
  const channel = useUpdatesStore((s) => s.channel)
  const running = runningUpdate()

  const chooseChannel = (next: UpdateChannel) => {
    if (next === channel) return
    const go = () => void switchChannel(next)
    if (next !== 'development') return go()
    Alert.alert(t('updates.developmentTitle'), t('updates.developmentBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('updates.developmentConfirm'), onPress: go },
    ])
  }

  const restart = () => {
    Alert.alert(t('updates.restartTitle'), t('updates.restartBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('updates.restart'), onPress: () => void restartIntoUpdate() },
    ])
  }

  // Back on production with no production update for this build: the development one stays.
  const stillOnDevelopment = channel === 'production' && running.channel === 'development'
  const message =
    status === 'upToDate' && stillOnDevelopment
      ? t('updates.developmentStillRunning')
      : status === 'upToDate'
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
                  ? [
                      shortUpdateId(running.updateId),
                      running.createdAt.toLocaleDateString(i18n.language),
                      running.channel
                        ? t(
                            `updates.channels.${running.channel === 'development' ? 'development' : 'production'}`,
                          )
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : t('updates.builtIn')
              }
            />
            <View style={styles.row}>
              <Text size="sm" color="textMuted">
                {t('updates.channel')}
              </Text>
              <View style={styles.chips}>
                {UPDATE_CHANNELS.map((c) => (
                  <Button
                    key={c}
                    label={t(`updates.channels.${c}`)}
                    compact
                    variant={channel === c ? 'primary' : 'secondary'}
                    onPress={() => chooseChannel(c)}
                  />
                ))}
              </View>
            </View>
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
        <View style={styles.links}>
          <Button
            label={t('settings.documentation')}
            variant="ghost"
            compact
            onPress={() => void Linking.openURL(DOCS_URL)}
          />
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  // Wraps on narrow phones ("desenvolvimento" is long).
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 1, gap: space.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
})
