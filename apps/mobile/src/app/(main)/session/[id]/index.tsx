import { router, Stack, useLocalSearchParams } from 'expo-router'
import { SquareTerminal } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { SmartComposer } from '@/features/autocomplete/SmartComposer'
import { ConversationScreen } from '@/features/conversation/ConversationScreen'
import { usePrompt } from '@/features/conversation/use-prompt'
import { ResumeBanner } from '@/features/lifecycle/ResumeBanner'
import { ModeSelector } from '@/features/mode/ModeSelector'
import { SessionMuteButton } from '@/features/mute/MuteControls'
import { SessionPermissions } from '@/features/permissions/components/SessionPermissions'
import { StateBadge } from '@/features/sessions/components/StateBadge'
import { useSessionsStore } from '@/features/sessions/store'
import { SubagentStrip } from '@/features/subagents/SubagentList'
import { headerActions, IconButton, Text } from '@/ui'

export default function SessionRoute() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionsStore((s) => s.sessions[id])
  const profile = useConnectionStore((s) => s.hello?.profiles.find((p) => p.id === session?.profileId))
  const prompt = usePrompt(id)
  const controllable = session?.controllable ?? false

  return (
    <>
      <Stack.Screen
        options={{
          ...headerActions(
            session ? (
              <View style={styles.actions}>
                <SessionMuteButton sessionId={id} />
                <IconButton
                  icon={SquareTerminal}
                  label={t('nav.terminal')}
                  disabled={!controllable}
                  onPress={() => router.push({ pathname: '/session/[id]/terminal', params: { id } })}
                />
              </View>
            ) : null,
          ),
          headerTitle: () => (
            <Text weight="bold" numberOfLines={1} style={styles.title}>
              {session?.title || t('common.session')}
            </Text>
          ),
        }}
      />
      <ConversationScreen
        sessionId={id}
        onKey={prompt.sendKey}
        header={
          session ? (
            <>
              {/* Session details live below the header: on iOS 26+ the bar has no room for them. */}
              <View style={styles.info}>
                <View style={styles.meta}>
                  <Text size="xs" style={{ color: profile?.color }}>
                    {profile?.name ?? session.profileId}
                  </Text>
                  <Text size="xs" color="textMuted" numberOfLines={1} style={styles.cwd}>
                    {shortPath(session.cwd)}
                  </Text>
                  <StateBadge state={session.state} />
                </View>
                <ModeSelector sessionId={id} mode={session.permissionMode} disabled={!controllable} />
              </View>
              <SubagentStrip sessionId={id} subagents={session.subagents} />
            </>
          ) : null
        }
        footer={
          session ? (
            <>
              <SessionPermissions sessionId={id} cwd={session.cwd} profileId={session.profileId} />
              <ResumeBanner session={session} />
            </>
          ) : null
        }
        composer={<SmartComposer sessionId={id} prompt={prompt} disabled={!controllable} />}
      />
    </>
  )
}

const styles = StyleSheet.create({
  title: { maxWidth: 200 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  meta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cwd: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
})
