import type { PushTestResult } from '@remote-harness/protocol'
import { ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { setLiveStatusEnabled, useLiveStatusSettings } from '@/features/live-status/settings-store'
import { setMuted, useMuteStore } from '@/features/mute/store'
import { setPushEnabled, usePushSettings } from '@/features/push/push-settings-store'
import { usePushState } from '@/features/push/push-state'
import { canTestPush, pushIssue } from '@/features/push/summary'
import { useSessionsStore } from '@/features/sessions/store'
import { Badge, Button, Card, Text } from '@/ui'
import { mutedSummary } from './summary'

/**
 * Settings → Notifications: the per-phone push toggle (with the push status and test while on),
 * the live status toggle and the Muted row that opens the profiles and sessions sheet.
 */
export function NotificationsCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const pushEnabled = usePushSettings((s) => s.enabled)
  const liveEnabled = useLiveStatusSettings((s) => s.enabled)
  const mutedProfiles = useMuteStore((s) => s.profiles)
  const mutedSessions = useMuteStore((s) => s.sessions)
  const [mutedOpen, setMutedOpen] = useState(false)
  return (
    <Card>
      <View style={layout.gap}>
        <Text weight="bold">{t('settings.notifications')}</Text>
        <ToggleRow
          title={t('settings.push')}
          hint={t('settings.pushHint')}
          value={pushEnabled}
          onChange={(value) => void setPushEnabled(value)}
        />
        {pushEnabled ? <PushStatus /> : null}
        <ToggleRow
          title={t('settings.liveStatus')}
          hint={t('settings.liveStatusHint')}
          value={liveEnabled}
          onChange={(value) => void setLiveStatusEnabled(value)}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setMutedOpen(true)}
          style={({ pressed }) => [styles.row, pressed && layout.pressed]}
        >
          <View style={layout.flex}>
            <Text size="sm">{t('settings.muted')}</Text>
            <Text size="xs" color="textMuted">
              {mutedSummary({ profiles: mutedProfiles.length, sessions: mutedSessions.length }, t)}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textDim} />
        </Pressable>
      </View>
      <MutedSheet visible={mutedOpen} onClose={() => setMutedOpen(false)} />
    </Card>
  )
}

function ToggleRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string
  hint: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <View style={layout.flex}>
        <Text size="sm">{title}</Text>
        <Text size="xs" color="textMuted">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: colors.accent, false: colors.borderStrong }}
      />
    </View>
  )
}

/** How pushes reach this phone, what is missing, and a test notification. */
function PushStatus() {
  const { t } = useTranslation()
  const client = useDaemonClient()
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
    <View style={layout.status}>
      <View style={layout.between}>
        <Text size="xs" color="textMuted">
          {t('pushSettings.computer')} · {t(`pushSettings.modes.${mode ?? 'unknown'}`)}
        </Text>
        <Badge
          label={t(`pushSettings.status.${off ? 'off' : issue ? 'issue' : 'ready'}`)}
          tone={off ? 'muted' : issue ? 'warning' : 'success'}
          dot
        />
      </View>
      <Text size="xs" color="textMuted">
        {t('pushSettings.phone')} · {t(`pushSettings.permission.${phone.permission}`)}
      </Text>
      {issue ? (
        <Text size="sm" color="textMuted">
          {t(`pushSettings.issues.${issue}`)}
        </Text>
      ) : null}
      <View style={layout.actions}>
        {issue === 'permissionDenied' ? (
          <Button
            label={t('pushSettings.openSettings')}
            variant="ghost"
            compact
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
        {canTestPush(mode, phone) ? (
          <Button
            label={testing ? t('pushSettings.testing') : t('pushSettings.test')}
            variant="ghost"
            compact
            disabled={testing}
            onPress={() => void test()}
          />
        ) : null}
      </View>
      {result ? (
        <Text size="sm" color={result === 'sent' ? 'success' : 'warning'} accessibilityLiveRegion="polite">
          {t(`pushSettings.results.${result}`)}
        </Text>
      ) : null}
    </View>
  )
}

/** Per-profile switches and the muted sessions, each unmutable. */
function MutedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const client = useDaemonClient()
  const profiles = useConnectionStore(selectProfiles)
  const mutedProfiles = useMuteStore((s) => s.profiles)
  const mutedSessions = useMuteStore((s) => s.sessions)
  const sessions = useSessionsStore((s) => s.sessions)
  const change = (target: 'profile' | 'session', id: string, muted: boolean) => {
    if (!client) return
    setMuted(client, target, id, muted).catch((error: unknown) =>
      Alert.alert(t('mute.changeFailed'), errorMessage(error, t)),
    )
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" accessibilityRole="header">
            {t('settings.muted')}
          </Text>
          <ScrollView style={layout.list} contentContainerStyle={layout.gap}>
            <Text size="xs" color="textMuted">
              {t('settings.profiles')}
            </Text>
            {profiles.map((p) => {
              const muted = mutedProfiles.includes(p.id)
              return (
                <View key={p.id} style={layout.between}>
                  <Text size="sm" style={{ color: p.color || colors.text }}>
                    {p.name}
                  </Text>
                  <Switch
                    value={!muted}
                    onValueChange={(on) => change('profile', p.id, !on)}
                    accessibilityLabel={p.name}
                    trackColor={{ true: colors.accent, false: colors.borderStrong }}
                  />
                </View>
              )
            })}
            {mutedSessions.length > 0 ? (
              <Text size="xs" color="textMuted" style={layout.sectionGap}>
                {t('settings.mutedSessionsTitle')}
              </Text>
            ) : null}
            {mutedSessions.map((id) => (
              <View key={id} style={layout.between}>
                <Text size="sm" numberOfLines={1} style={layout.flex}>
                  {sessions[id]?.title || t('common.session')}
                </Text>
                <Button
                  label={t('mute.unmute')}
                  variant="ghost"
                  compact
                  onPress={() => change('session', id, false)}
                />
              </View>
            ))}
          </ScrollView>
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const layout = StyleSheet.create({
  gap: { gap: space.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  status: { gap: space.xs, paddingLeft: space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  list: { flexGrow: 0, maxHeight: 360 },
  sectionGap: { marginTop: space.sm },
})

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
}))
