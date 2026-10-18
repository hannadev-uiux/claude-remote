import type { PushTestResult } from '@remote-harness/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space } from '@/core/theme'
import { Badge, Button, Card, Text } from '@/ui'
import { usePushState } from './push-state'
import { canTestPush, pushIssue } from './summary'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text size="sm" color="textMuted">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </View>
  )
}

/** How pushes reach this phone, what is missing, and a test notification. */
export function PushCard() {
  const { t } = useTranslation()
  const client = useConnectionStore((s) => s.client)
  const mode = useConnectionStore((s) => s.hello?.push?.mode ?? null)
  const phone = usePushState()
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<PushTestResult | null>(null)
  const issue = pushIssue(mode, phone)
  const off = mode === 'off'

  const test = async () => {
    if (!client || !phone.token) return
    setTesting(true)
    setResult(null)
    try {
      const reply = await client.request({ type: 'push.test', fcmToken: phone.token })
      setResult(reply.type === 'push.testResult' ? reply.result : 'failed')
    } catch {
      setResult('failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <View style={styles.gap}>
        <View style={styles.title}>
          <Text weight="bold">{t('pushSettings.title')}</Text>
          <Badge
            label={t(`pushSettings.status.${off ? 'off' : issue ? 'issue' : 'ready'}`)}
            tone={off ? 'muted' : issue ? 'warning' : 'success'}
            dot
          />
        </View>
        <Row label={t('pushSettings.computer')} value={t(`pushSettings.modes.${mode ?? 'unknown'}`)} />
        <Row label={t('pushSettings.phone')} value={t(`pushSettings.permission.${phone.permission}`)} />
        {issue ? (
          <Text size="sm" color="textMuted">
            {t(`pushSettings.issues.${issue}`)}
          </Text>
        ) : null}
        {issue === 'permissionDenied' ? (
          <Button
            label={t('pushSettings.openSettings')}
            variant="ghost"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
        {canTestPush(mode, phone) ? (
          <Button
            label={testing ? t('pushSettings.testing') : t('pushSettings.test')}
            variant="ghost"
            disabled={testing}
            onPress={() => void test()}
          />
        ) : null}
        {result ? (
          <Text size="sm" color={result === 'sent' ? 'success' : 'warning'} accessibilityLiveRegion="polite">
            {t(`pushSettings.results.${result}`)}
          </Text>
        ) : null}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  title: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
})
