import type { SubagentInfo } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { Bot } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { sortSubagents, subagentLabel } from './sort'

function open(sessionId: string, agentId: string) {
  router.push({ pathname: '/session/[id]/agent/[agentId]', params: { id: sessionId, agentId } })
}

/** Nested rows under a session in the list (max 3). */
export function NestedSubagents({ sessionId, subagents }: { sessionId: string; subagents: SubagentInfo[] }) {
  const { t } = useTranslation()
  if (subagents.length === 0) return null
  const sorted = sortSubagents(subagents)
  const running = sorted.filter((s) => s.state === 'running').length
  return (
    <>
      {sorted.slice(0, 3).map((sub) => (
        <Pressable key={sub.agentId} onPress={() => open(sessionId, sub.agentId)} style={styles.nested}>
          <Text size="xs" color={sub.state === 'running' ? 'accent' : 'textDim'} numberOfLines={1}>
            ⤷ {subagentLabel(sub)} {sub.state === 'running' ? t('subagents.running') : t('subagents.done')}
          </Text>
        </Pressable>
      ))}
      {sorted.length > 3 ? (
        <Text size="xs" color="textDim" style={styles.more}>
          {t('subagents.more', { count: sorted.length - 3, running })}
        </Text>
      ) : null}
    </>
  )
}

/** Horizontal strip of subagents shown on top of the conversation. */
export function SubagentStrip({ sessionId, subagents }: { sessionId: string; subagents: SubagentInfo[] }) {
  if (subagents.length === 0) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.strip}
    >
      {sortSubagents(subagents).map((sub) => (
        <Pressable
          key={sub.agentId}
          onPress={() => open(sessionId, sub.agentId)}
          style={[styles.chip, sub.state === 'running' && styles.running]}
        >
          <Bot size={12} color={sub.state === 'running' ? colors.accent : colors.textDim} />
          <Text size="xs" color={sub.state === 'running' ? 'text' : 'textMuted'} numberOfLines={1}>
            {subagentLabel(sub)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  nested: {
    marginLeft: space.xl + space.lg,
    marginRight: space.lg,
    marginTop: -space.xs,
    marginBottom: space.sm,
  },
  more: { marginLeft: space.xl + space.lg, marginBottom: space.sm },
  bar: { flexGrow: 0 },
  strip: { gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    maxWidth: 200,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  running: { borderColor: colors.accent },
})
