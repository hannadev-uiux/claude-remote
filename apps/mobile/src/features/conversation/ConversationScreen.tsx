import type { Key } from '@remote-harness/protocol'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { keyboardBehavior } from '@/core/platform/platform'
import { makeStyles, maxContentWidth, radius, space, useTheme } from '@/core/theme'
import { ConnectionBanner, Screen, Text } from '@/ui'
import { TranscriptImagesContext } from '../images/use-transcript-image'
import { sessionAgent } from '../sessions/agent'
import { useSessionsStore } from '../sessions/store'
import { ConversationAgent } from './agent-context'
import { keyboardOffset } from './autocorrect'
import { KeyBar } from './components/KeyBar'
import { LinkSheet } from './components/LinkSheet'
import {
  AssistantMessage,
  CompactSummary,
  SystemLine,
  TaggedEntry,
  TaskNotification,
  ThinkingBlock,
  UnknownEntry,
  UserMessage,
} from './components/Messages'
import { PromptHistorySheet } from './components/PromptHistorySheet'
import { ToolCallCard } from './components/ToolCallCard'
import { useFollowStore } from './follow-store'
import { useKeyBarStore } from './key-bar-store'
import { useKeyboardToolbarStore } from './keyboard-toolbar-store'
import type { PromptHistoryItem } from './prompt-history'
import { loadOlder, selectStream, streamKey, subscribeTranscript, useTranscriptStore } from './store'
import { buildTimeline, type TimelineItem } from './timeline'
import { useFollowScroll } from './use-follow-scroll'

function renderItem({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case 'user':
      return <UserMessage text={item.text} images={item.images} />
    case 'assistant':
      return <AssistantMessage text={item.text} />
    case 'thinking':
      return <ThinkingBlock text={item.text} />
    case 'tool':
      return <ToolCallCard use={item.use} result={item.result} />
    case 'system':
      if (item.subtype === 'task_notification')
        return <TaskNotification text={item.text} status={item.status} note={item.note} />
      if (item.subtype === 'tagged' && item.tag) return <TaggedEntry tag={item.tag} text={item.text} />
      if (item.subtype === 'compact_summary') return <CompactSummary text={item.text} />
      return (
        <SystemLine
          text={item.text}
          subtype={item.subtype}
          durationMs={item.durationMs}
          trigger={item.trigger}
        />
      )
    case 'unknown':
      return <UnknownEntry raw={item.raw} />
  }
}

type Props = {
  sessionId: string
  agentId?: string
  /** Prompt composer (omitted for read-only views like subagents). */
  composer?: ReactNode
  /** Rendered between the list and the composer (permission cards). */
  footer?: ReactNode
  /** Rendered above the list (subagents strip). */
  header?: ReactNode
  onKey?: (key: Key) => void
  /** Shows the prompt history sheet (opened from the session options menu). */
  historyOpen?: boolean
  onHistoryClose?: () => void
}

export function ConversationScreen({
  sessionId,
  agentId,
  composer,
  footer,
  header,
  onKey,
  historyOpen = false,
  onHistoryClose,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  // Subagents share their parent's agent; the color of assistant entries comes from it.
  const agent = useSessionsStore((s) => {
    const session = s.sessions[sessionId]
    return session ? sessionAgent(session) : null
  })
  const key = streamKey(sessionId, agentId)
  const stream = useTranscriptStore(selectStream(key))
  const controllable = useSessionsStore((s) => s.sessions[sessionId]?.controllable ?? false)
  // While the keyboard toolbar shows the same keys, the bar under the conversation steps aside.
  const keyBarShown = useKeyBarStore((s) => s.visible)
  const keyBarHidden = useKeyboardToolbarStore((s) => s.keyBarHiddenBy !== null)
  const keyBarVisible = keyBarShown && !keyBarHidden
  const items = useMemo(() => buildTimeline(stream.entries), [stream.entries])
  // Where the conversation starts in the window (under the header, the banner, the session header):
  // the keyboard offset, so the composer and its toolbar sit right above the keyboard.
  const anchor = useRef<View>(null)
  const [windowY, setWindowY] = useState<number | null>(null)
  const follow = useFollowStore((s) => s.follow)
  const listRef = useRef<FlashListRef<TimelineItem>>(null)
  const imageSource = useMemo(() => ({ sessionId, agentId }), [sessionId, agentId])
  const { unseen, scrollProps, jumpToEnd, leaveEnd } = useFollowScroll({
    listRef,
    itemCount: items.length,
    lastKey: items[items.length - 1]?.key ?? null,
    streamKey: key,
    follow,
  })

  useEffect(() => {
    if (!client) return
    return subscribeTranscript(client, sessionId, agentId)
  }, [client, sessionId, agentId])

  const loadEarlier = () => {
    if (client) void loadOlder(client, sessionId, agentId).catch(() => undefined)
  }

  const jumpToPrompt = (prompt: PromptHistoryItem) => {
    onHistoryClose?.()
    const item = items.find((i) => i.key === prompt.key)
    if (!item) return
    // Leaving the end: content arriving during the animation must not pull the list back.
    leaveEnd()
    listRef.current?.scrollToItem({ item, animated: true, viewPosition: 0 })
  }

  return (
    <TranscriptImagesContext.Provider value={imageSource}>
      <ConversationAgent.Provider value={agent}>
        <Screen>
          <ConnectionBanner />
          {header}
          <View
            ref={anchor}
            style={styles.flex}
            onLayout={() => anchor.current?.measureInWindow((_x, y) => setWindowY(y))}
          >
            <KeyboardAvoidingView
              behavior={keyboardBehavior(Platform.OS)}
              keyboardVerticalOffset={keyboardOffset(windowY)}
              style={styles.flex}
            >
              <View style={styles.flex}>
                <FlashList
                  ref={listRef}
                  data={items}
                  keyExtractor={(item) => item.key}
                  getItemType={(item) => item.type}
                  renderItem={renderItem}
                  // Anchoring stays on (older pages do not move the viewport); following the end is done
                  // here instead of FlashList's autoscroll, whose sticky "near the bottom" flag could pull
                  // the user back while they start scrolling up (#38).
                  maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
                  onStartReached={loadEarlier}
                  onStartReachedThreshold={0.5}
                  {...scrollProps}
                  // Fixed header: swapping it for the spinner would shift the content (anchoring ignores it).
                  ListHeaderComponent={<View style={styles.top} />}
                  ListEmptyComponent={
                    <Text color="textMuted" style={styles.empty}>
                      {stream.error != null ? errorMessage(stream.error, t) : t('conversation.loading')}
                    </Text>
                  }
                  contentContainerStyle={styles.content}
                />
                {stream.loadingOlder ? (
                  <ActivityIndicator color={colors.accentText} style={styles.loader} />
                ) : null}
                {unseen ? (
                  <Pressable accessibilityRole="button" onPress={jumpToEnd} style={styles.unseen}>
                    <Text size="xs" weight="bold" color="accentInk">
                      {t('conversation.newMessages')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {footer}
              {onKey && keyBarVisible ? <KeyBar onKey={onKey} disabled={!controllable} /> : null}
              {composer}
            </KeyboardAvoidingView>
          </View>
          {onHistoryClose ? (
            <PromptHistorySheet
              visible={historyOpen}
              stream={stream}
              onPick={jumpToPrompt}
              onLoadEarlier={loadEarlier}
              onClose={onHistoryClose}
            />
          ) : null}
          {Platform.OS === 'ios' ? null : <LinkSheet />}
        </Screen>
      </ConversationAgent.Provider>
    </TranscriptImagesContext.Provider>
  )
}

const useStyles = makeStyles((theme) => ({
  flex: { flex: 1 },
  // In wide panes (iPad) the content is centered in a column; in narrow panes `maxWidth` is never
  // reached and the column takes up 100% of the width, same as before.
  content: { paddingBottom: space.lg, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  loader: { position: 'absolute', top: space.sm, alignSelf: 'center', pointerEvents: 'none' },
  top: { height: space.sm },
  empty: { padding: space.xl, textAlign: 'center' },
  unseen: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
}))
