import { router, Stack, useLocalSearchParams } from 'expo-router'
import { EllipsisVertical } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { SmartComposer } from '@/features/autocomplete/SmartComposer'
import { ConversationScreen } from '@/features/conversation/ConversationScreen'
import { setKeyBarVisible, useKeyBarStore } from '@/features/conversation/key-bar-store'
import { type SessionMenuAction, sessionMenu } from '@/features/conversation/session-menu'
import { usePrompt } from '@/features/conversation/use-prompt'
import { ResumeBanner } from '@/features/lifecycle/ResumeBanner'
import { ModeSelector } from '@/features/mode/ModeSelector'
import { SessionMuteButton } from '@/features/mute/MuteControls'
import { SessionPermissions } from '@/features/permissions/components/SessionPermissions'
import { StateBadge } from '@/features/sessions/components/StateBadge'
import { useSessionsStore } from '@/features/sessions/store'
import { SubagentStrip } from '@/features/subagents/SubagentList'
import { ActionMenu, headerActions, Text } from '@/ui'

export default function SessionRoute() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionsStore((s) => s.sessions[id])
  const profile = useConnectionStore((s) => s.hello?.profiles.find((p) => p.id === session?.profileId))
  const prompt = usePrompt(id)
  const controllable = session?.controllable ?? false
  const keyBarVisible = useKeyBarStore((s) => s.visible)
  const [historyOpen, setHistoryOpen] = useState(false)
  const menu = sessionMenu({ controllable, keyBarVisible }, t)
  const actions: Record<SessionMenuAction, () => void> = {
    terminal: () => router.push({ pathname: '/session/[id]/terminal', params: { id } }),
    toggleKeyBar: () => void setKeyBarVisible(!keyBarVisible),
    history: () => setHistoryOpen(true),
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...headerActions(
            session ? (
              <View style={styles.actions}>
                <SessionMuteButton sessionId={id} />
                <ActionMenu
                  icon={EllipsisVertical}
                  label={t('sessionMenu.moreOptions')}
                  items={menu.items.map((item) => ({ ...item, onPress: actions[item.key] }))}
                  disabledReason={menu.disabledReason}
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
        historyOpen={historyOpen}
        onHistoryClose={() => setHistoryOpen(false)}
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
