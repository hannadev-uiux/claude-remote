import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { crashReport, dismissCrashReport, sendCrashReport } from '../capture'
import { reportJson } from '../format'
import { useErrorReportsStore } from '../store'
import { PreferenceChoice } from './PreferenceChoice'
import { ReportPreview } from './ReportPreview'

/** Asked on the launch after a crash ("Ask each time"): preview, Send / Don't send, next time. */
export function CrashPromptSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const prompt = useErrorReportsStore((s) => s.prompt)
  const [busy, setBusy] = useState(false)
  // Rebuilt each time the prompt opens.
  const preview = useMemo(() => (prompt ? reportJson(crashReport()) : ''), [prompt])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    await action().catch(() => undefined)
    setBusy(false)
  }

  return (
    <Modal
      visible={prompt !== null}
      transparent
      animationType="slide"
      onRequestClose={() => void run(dismissCrashReport)}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('errorReports.crash.title')}</Text>
          <Text size="sm" color="textMuted">
            {t('errorReports.crash.body')}
          </Text>
          <ReportPreview text={preview} />
          {prompt?.native ? (
            <Text size="xs" color="textMuted">
              {t('errorReports.crash.native')}
            </Text>
          ) : null}
          <Text size="xs" color="textMuted">
            {t('errorReports.crash.nextTime')}
          </Text>
          <PreferenceChoice />
          <View style={styles.actions}>
            <Button
              label={t('errorReports.crash.dontSend')}
              variant="ghost"
              disabled={busy}
              flex
              onPress={() => void run(dismissCrashReport)}
            />
            <Button
              label={t('errorReports.crash.send')}
              variant="primary"
              loading={busy}
              flex
              onPress={() => void run(sendCrashReport)}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
}))
