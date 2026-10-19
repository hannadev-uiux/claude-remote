import { router } from 'expo-router'
import { X } from 'lucide-react-native'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import type { PaneMode } from '@/core/layout'
import { makeStyles, space, useTheme } from '@/core/theme'
import { SessionDetailsList } from '@/features/sessions/components/SessionDetailsList'
import { useSessionsStore } from '@/features/sessions/store'
import { SubagentRows } from '@/features/subagents/SubagentRows'
import { TerminalScreen } from '@/features/terminal/TerminalScreen'
import { IconButton, Text } from '@/ui'
import { INSPECTOR_TABS, inspectorTabLabel, resizedInspectorWidth } from './logic'
import { setInspectorOpen, setInspectorTab, setInspectorWidth, useInspectorStore } from './store'

/**
 * Tablet inspector: Terminal (the pane mirror), Subagents (count in the tab) and Details of the
 * open session. Inline as the third column when the window is wide, a side sheet on two columns.
 * Its left edge drags to resize it between 280 and 420 points.
 */
export function InspectorPane({ sessionId, mode }: { sessionId: string; mode: Exclude<PaneMode, 'none'> }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const tab = useInspectorStore((s) => s.tab)
  const width = useInspectorStore((s) => s.width)
  const session = useSessionsStore((s) => s.sessions[sessionId])
  const profile = useConnectionStore((s) => s.hello?.profiles.find((p) => p.id === session?.profileId))
  const startWidth = useRef(width)
  const resizer = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gesture) => Math.abs(gesture.dx) > 2,
      onPanResponderGrant: () => {
        startWidth.current = useInspectorStore.getState().width
      },
      onPanResponderMove: (_e, gesture) =>
        setInspectorWidth(resizedInspectorWidth(startWidth.current, gesture.dx)),
    }),
  ).current
  const subagents = session?.subagents ?? []

  return (
    <View style={styles.pane}>
      <View
        {...resizer.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={t('tablet.resize')}
        style={styles.handle}
      />
      <View style={styles.tabs}>
        {INSPECTOR_TABS.map((item) => {
          const selected = item === tab
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setInspectorTab(item)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text
                size="xs"
                weight={selected ? 'bold' : 'medium'}
                color={selected ? 'accentText' : 'textMuted'}
              >
                {inspectorTabLabel(item, subagents.length, t)}
              </Text>
            </Pressable>
          )
        })}
        <View style={styles.spacer} />
        {mode === 'overlay' ? (
          <IconButton icon={X} size={16} label={t('common.close')} onPress={() => setInspectorOpen(false)} />
        ) : null}
      </View>
      {!session ? (
        <Text size="sm" color="textMuted" style={styles.empty}>
          {t('sessions.detailEmptyBody')}
        </Text>
      ) : tab === 'terminal' ? (
        <TerminalScreen sessionId={sessionId} />
      ) : tab === 'subagents' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {subagents.length === 0 ? (
            <Text size="sm" color="textMuted">
              {t('tablet.noSubagents')}
            </Text>
          ) : (
            <SubagentRows
              subagents={subagents}
              onOpen={(agentId) =>
                router.push({ pathname: '/session/[id]/agent/[agentId]', params: { id: sessionId, agentId } })
              }
            />
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <SessionDetailsList session={session} profile={profile} />
        </ScrollView>
      )}
      <View style={[styles.edge, { backgroundColor: colors.border }]} pointerEvents="none" />
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  pane: { flex: 1, backgroundColor: theme.colors.background },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 12,
    zIndex: 1,
  },
  edge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: StyleSheet.hairlineWidth },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tab: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 6 },
  tabSelected: { backgroundColor: theme.colors.accentSoft },
  spacer: { flex: 1 },
  content: { padding: space.md, gap: space.xs },
  empty: { padding: space.lg },
}))
