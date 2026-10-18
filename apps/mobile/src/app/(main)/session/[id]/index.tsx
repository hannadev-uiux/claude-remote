import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ChevronDown, EllipsisVertical, Terminal } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { makeStyles, space, useTheme } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { SmartComposer } from '@/features/autocomplete/SmartComposer'
import { ConversationScreen } from '@/features/conversation/ConversationScreen'
import { setFollow, useFollowStore } from '@/features/conversation/follow-store'
import { setKeyBarVisible, useKeyBarStore } from '@/features/conversation/key-bar-store'
import { type SessionMenuAction, sessionMenu } from '@/features/conversation/session-menu'
import { usePrompt } from '@/features/conversation/use-prompt'
import { ResumeBanner } from '@/features/lifecycle/ResumeBanner'
import { ModeSelector } from '@/features/mode/ModeSelector'
import { SessionMuteButton } from '@/features/mute/MuteControls'
import { SessionPermissions } from '@/features/permissions/components/SessionPermissions'
import { QueueCard } from '@/features/queue/components/QueueCard'
import { StatusBar } from '@/features/session-status/StatusBar'
import { sessionAgent } from '@/features/sessions/agent'
import { CloseSessionSheet } from '@/features/sessions/components/CloseSessionSheet'
import { SessionDetailsSheet } from '@/features/sessions/components/SessionDetailsSheet'
import { StateBadge } from '@/features/sessions/components/StateBadge'
import { useSessionsStore } from '@/features/sessions/store'
import { SubagentsSheet } from '@/features/subagents/SubagentsSheet'
import { subagentCounts } from '@/features/subagents/sort'
import { ActionMenu, AgentBadge, headerActions, IconButton, ProfileTag, Text } from '@/ui'

export default function SessionRoute() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionsStore((s) => s.sessions[id])
  const profile = useConnectionStore((s) => s.hello?.profiles.find((p) => p.id === session?.profileId))
  const prompt = usePrompt(id)
  const controllable = session?.controllable ?? false
  const keyBarVisible = useKeyBarStore((s) => s.visible)
  const following = useFollowStore((s) => s.follow)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [subagentsOpen, setSubagentsOpen] = useState(false)
  const subagentStats = subagentCounts(session?.subagents ?? [])
  const agent = session ? sessionAgent(session) : null
  const title = session?.title || t('common.session')
  // A focused composer would keep the keyboard over the sheet's lower rows.
  const openDetails = () => {
    Keyboard.dismiss()
    setDetailsOpen(true)
  }
  const menu = sessionMenu({ controllable, keyBarVisible, following, subagents: subagentStats }, t)
  const actions: Record<SessionMenuAction, () => void> = {
    terminal: () => router.push({ pathname: '/session/[id]/terminal', params: { id } }),
    subagents: () => {
      Keyboard.dismiss()
      setSubagentsOpen(true)
    },
    toggleKeyBar: () => void setKeyBarVisible(!keyBarVisible),
    history: () => setHistoryOpen(true),
    toggleFollow: () => void setFollow(!following),
    close: () => {
      Keyboard.dismiss()
      setCloseOpen(true)
    },
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...headerActions(
            session ? (
              <View style={styles.actions}>
                <SessionMuteButton sessionId={id} />
                <IconButton
                  icon={Terminal}
                  label={t('sessionMenu.terminal')}
                  disabled={!controllable}
                  onPress={actions.terminal}
                />
                <ActionMenu
                  icon={EllipsisVertical}
                  label={t('sessionMenu.moreOptions')}
                  items={menu.items.map((item) => ({ ...item, onPress: actions[item.key] }))}
                  disabledReason={menu.disabledReason}
                  attention={subagentStats.running > 0}
                />
              </View>
            ) : null,
          ),
          headerTitle: () =>
            session ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sessionDetails.open', { title })}
                accessibilityHint={t('sessionDetails.openHint')}
                hitSlop={8}
                onPress={openDetails}
                style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}
              >
                <Text weight="bold" numberOfLines={1} style={styles.titleText}>
                  {title}
                </Text>
                <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            ) : (
              <Text weight="bold" numberOfLines={1} style={styles.title}>
                {title}
              </Text>
            ),
        }}
      />
      {session ? (
        <SessionDetailsSheet
          visible={detailsOpen}
          session={session}
          profile={profile}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
      {session && closeOpen ? (
        <CloseSessionSheet session={session} mode="close" onDone={() => setCloseOpen(false)} />
      ) : null}
      {session ? (
        <SubagentsSheet
          sessionId={id}
          subagents={session.subagents}
          visible={subagentsOpen}
          onClose={() => setSubagentsOpen(false)}
        />
      ) : null}
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
                  {agent ? <AgentBadge agent={agent} size={18} /> : null}
                  <ProfileTag profile={profile ?? { name: session.profileId, color: '' }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('sessionDetails.openFolder', { folder: shortPath(session.cwd) })}
                    accessibilityHint={t('sessionDetails.openHint')}
                    hitSlop={{ top: 12, bottom: 12 }}
                    onPress={openDetails}
                    style={({ pressed }) => [styles.cwd, pressed && styles.pressed]}
                  >
                    <Text size="xs" color="textMuted" numberOfLines={1}>
                      {shortPath(session.cwd)}
                    </Text>
                  </Pressable>
                  <StateBadge state={session.state} />
                </View>
                <ModeSelector sessionId={id} mode={session.permissionMode} disabled={!controllable} />
              </View>
              <StatusBar
                status={session.status}
                profileId={session.profileId}
                branch={session.checkout?.branch ?? null}
              />
            </>
          ) : null
        }
        footer={
          session ? (
            <>
              <SessionPermissions sessionId={id} cwd={session.cwd} profileId={session.profileId} />
              <QueueCard sessionId={id} />
              <ResumeBanner session={session} />
            </>
          ) : null
        }
        composer={<SmartComposer sessionId={id} prompt={prompt} disabled={!controllable} />}
      />
    </>
  )
}

const useStyles = makeStyles((theme) => ({
  title: { maxWidth: 200 },
  titleButton: { maxWidth: 200, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  titleText: { flexShrink: 1 },
  pressed: { opacity: 0.6 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  meta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cwd: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
}))
