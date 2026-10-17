import type { Key } from '@remote-harness/protocol'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { keyboardBehavior } from '@/core/platform/platform'
import { colors, maxContentWidth, radius, space } from '@/core/theme'
import { ConnectionBanner, Screen, Text } from '@/ui'
import { useSessionsStore } from '../sessions/store'
import { KeyBar } from './components/KeyBar'
import { AssistantMessage, SystemLine, ThinkingBlock, UnknownEntry, UserMessage } from './components/Messages'
import { ToolCallCard } from './components/ToolCallCard'
import { loadOlder, selectStream, streamKey, subscribeTranscript, useTranscriptStore } from './store'
import { buildTimeline, type TimelineItem } from './timeline'

function renderItem({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case 'user':
      return <UserMessage text={item.text} />
    case 'assistant':
      return <AssistantMessage text={item.text} />
    case 'thinking':
      return <ThinkingBlock text={item.text} />
    case 'tool':
      return <ToolCallCard use={item.use} result={item.result} />
    case 'system':
      return <SystemLine text={item.text} subtype={item.subtype} durationMs={item.durationMs} />
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
}

export function ConversationScreen({ sessionId, agentId, composer, footer, header, onKey }: Props) {
  const { t } = useTranslation()
  const client = useDaemonClient()
  const key = streamKey(sessionId, agentId)
  const stream = useTranscriptStore(selectStream(key))
  const controllable = useSessionsStore((s) => s.sessions[sessionId]?.controllable ?? false)
  const items = useMemo(() => buildTimeline(stream.entries), [stream.entries])
  const listRef = useRef<FlashListRef<TimelineItem>>(null)
  const atBottom = useRef(true)
  const seenCount = useRef(0)
  const [unseen, setUnseen] = useState(false)

  useEffect(() => {
    if (!client) return
    return subscribeTranscript(client, sessionId, agentId)
  }, [client, sessionId, agentId])

  useEffect(() => {
    if (items.length > seenCount.current && !atBottom.current && seenCount.current > 0) setUnseen(true)
    seenCount.current = items.length
  }, [items.length])

  const jumpToEnd = () => {
    listRef.current?.scrollToEnd({ animated: true })
    setUnseen(false)
  }

  return (
    <Screen>
      <ConnectionBanner />
      {header}
      <KeyboardAvoidingView
        behavior={keyboardBehavior(Platform.OS)}
        keyboardVerticalOffset={90}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <FlashList
            ref={listRef}
            data={items}
            keyExtractor={(item) => item.key}
            getItemType={(item) => item.type}
            renderItem={renderItem}
            maintainVisibleContentPosition={{
              startRenderingFromBottom: true,
              autoscrollToBottomThreshold: 0.2,
            }}
            onStartReached={() => {
              if (client) void loadOlder(client, sessionId, agentId).catch(() => undefined)
            }}
            onStartReachedThreshold={0.5}
            onScroll={({ nativeEvent }) => {
              const distance =
                nativeEvent.contentSize.height -
                nativeEvent.layoutMeasurement.height -
                nativeEvent.contentOffset.y
              atBottom.current = distance < 80
              if (atBottom.current) setUnseen(false)
            }}
            scrollEventThrottle={100}
            ListHeaderComponent={
              stream.loadingOlder ? (
                <ActivityIndicator color={colors.accent} style={styles.loader} />
              ) : (
                <View style={styles.top} />
              )
            }
            ListEmptyComponent={
              <Text color="textMuted" style={styles.empty}>
                {stream.error != null ? errorMessage(stream.error, t) : t('conversation.loading')}
              </Text>
            }
            contentContainerStyle={styles.content}
          />
          {unseen ? (
            <Pressable onPress={jumpToEnd} style={styles.unseen}>
              <Text size="xs" weight="bold" color="background">
                {t('conversation.newMessages')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {footer}
        {onKey ? <KeyBar onKey={onKey} disabled={!controllable} /> : null}
        {composer}
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // In wide panes (iPad) the content is centered in a column; in narrow panes `maxWidth` is never
  // reached and the column takes up 100% of the width, same as before.
  content: { paddingBottom: space.lg, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  loader: { padding: space.md },
  top: { height: space.sm },
  empty: { padding: space.xl, textAlign: 'center' },
  unseen: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
})
