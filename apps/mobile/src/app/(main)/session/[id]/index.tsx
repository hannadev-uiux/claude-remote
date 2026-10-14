import { router, Stack, useLocalSearchParams } from 'expo-router'
import { SquareTerminal } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space } from '@/core/theme'
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
import { IconButton, Text } from '@/ui'

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionsStore((s) => s.sessions[id])
  const profile = useConnectionStore((s) => s.hello?.profiles.find((p) => p.id === session?.profileId))
  const prompt = usePrompt(id)
  const controllable = session?.controllable ?? false

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            session ? (
              <View style={styles.actions}>
                <ModeSelector sessionId={id} mode={session.permissionMode} disabled={!controllable} />
                <SessionMuteButton sessionId={id} />
                <IconButton
                  icon={SquareTerminal}
                  label="Terminal"
                  disabled={!controllable}
                  onPress={() => router.push({ pathname: '/session/[id]/terminal', params: { id } })}
                />
              </View>
            ) : null,
          headerTitle: () => (
            <View style={styles.header}>
              <Text weight="bold" numberOfLines={1}>
                {session?.title ?? 'Sessão'}
              </Text>
              <View style={styles.sub}>
                <Text size="xs" style={{ color: profile?.color }}>
                  {profile?.name ?? session?.profileId ?? ''}
                </Text>
                <Text size="xs" color="textMuted" numberOfLines={1}>
                  {session ? shortPath(session.cwd) : ''}
                </Text>
                {session ? <StateBadge state={session.state} /> : null}
              </View>
            </View>
          ),
        }}
      />
      <ConversationScreen
        sessionId={id}
        onKey={prompt.sendKey}
        header={session ? <SubagentStrip sessionId={id} subagents={session.subagents} /> : null}
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
  header: { alignItems: 'center', maxWidth: 260 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
})
