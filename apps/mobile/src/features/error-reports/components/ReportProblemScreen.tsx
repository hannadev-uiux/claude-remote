import type { RejectedRequest } from '@remote-harness/protocol'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Platform, ScrollView, Share, Switch, TextInput, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { Button, Screen, Text } from '@/ui'
import { currentContext } from '../capture'
import { canSend } from '../consent'
import { crashlyticsReady, sendReport } from '../crashlytics'
import { buildReport, githubIssueUrl, reportJson } from '../format'
import { recentEntries } from '../log'
import { writeReportFile } from '../storage'
import { useErrorReportsStore } from '../store'
import { ReportPreview } from './ReportPreview'

type DaemonDiagnostics = { version: string; errors: RejectedRequest[] }

/** The computer's recent rejected requests; null when not connected or not supported. */
function useDaemonDiagnostics(): DaemonDiagnostics | null {
  const client = useDaemonClient()
  const [diagnostics, setDiagnostics] = useState<DaemonDiagnostics | null>(null)
  useEffect(() => {
    if (!client) return
    let active = true
    client
      .request({ type: 'diagnostics.errors' })
      .then((reply) => {
        if (active && reply.type === 'diagnostics.result')
          setDiagnostics({ version: reply.daemonVersion, errors: reply.errors })
      })
      // Older daemons answer `unknown_type` and offline requests fail: the option stays hidden.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [client])
  return diagnostics
}

/** Settings → Report a problem: description, preview, and Send / Share / GitHub issue. */
export function ReportProblemScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const entries = useErrorReportsStore((s) => s.entries)
  const preference = useErrorReportsStore((s) => s.preference)
  const daemon = useDaemonDiagnostics()
  const [description, setDescription] = useState('')
  const [includeComputer, setIncludeComputer] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'sent' | 'failed' | null>(null)

  const report = useMemo(
    () =>
      buildReport({
        kind: 'manual',
        at: new Date(),
        description,
        context: currentContext(),
        entries: recentEntries(entries),
        daemon: includeComputer ? daemon : null,
      }),
    [description, entries, includeComputer, daemon],
  )
  const json = useMemo(() => reportJson(report), [report])

  const send = async () => {
    setSending(true)
    setResult((await sendReport(report)) ? 'sent' : 'failed')
    setSending(false)
  }

  const share = () => {
    const uri =
      Platform.OS === 'ios' ? writeReportFile(`remote-harness-report-${Date.now()}.json`, json) : null
    void Share.share(uri ? { url: uri } : { message: json }).catch(() => undefined)
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text size="sm">{t('errorReports.problem.description')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('errorReports.problem.placeholder')}
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={1000}
          style={styles.input}
        />
        <Text size="xs" color="textMuted">
          {t('errorReports.problem.descriptionHint')}
        </Text>
        {daemon ? (
          <View style={styles.row}>
            <Text size="sm" style={styles.flex}>
              {t('errorReports.problem.includeComputer')}
            </Text>
            <Switch
              value={includeComputer}
              onValueChange={setIncludeComputer}
              accessibilityLabel={t('errorReports.problem.includeComputer')}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
        ) : null}
        <Text size="xs" color="textMuted">
          {t('errorReports.problem.preview')}
        </Text>
        <ReportPreview text={json} maxHeight={320} />
        {result ? (
          <Text size="sm" color={result === 'sent' ? 'success' : 'warning'}>
            {t(`errorReports.problem.${result}`)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {canSend(preference, crashlyticsReady()) ? (
            <Button
              label={t('errorReports.problem.send')}
              variant="primary"
              loading={sending}
              disabled={result === 'sent'}
              onPress={() => void send()}
            />
          ) : null}
          <Button label={t('errorReports.problem.share')} onPress={share} />
          <Button
            label={t('errorReports.problem.github')}
            variant="ghost"
            onPress={() => void Linking.openURL(githubIssueUrl(report))}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

const useStyles = makeStyles((theme) => ({
  content: { padding: space.lg, gap: space.sm },
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 },
  actions: { gap: space.sm, marginTop: space.sm },
}))
