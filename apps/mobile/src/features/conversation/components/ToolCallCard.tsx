import type { TranscriptEntry } from '@claude-remote/protocol'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { memo, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { diffForTool } from '../diff'
import { summarizeTool } from '../summarize-tool'
import { DiffView } from './DiffView'

type Use = Extract<TranscriptEntry, { kind: 'tool_use' }>
type Result = Extract<TranscriptEntry, { kind: 'tool_result' }>

const PREVIEW_CHARS = 4_000

export const ToolCallCard = memo(function ToolCallCard({
  use,
  result,
}: {
  use: Use | null
  result: Result | null
}) {
  const [open, setOpen] = useState(false)
  const title = use ? summarizeTool(use.name, use.input) : 'resultado'
  const diff = useMemo(() => (use ? diffForTool(use.name, use.input) : null), [use])
  const status: 'running' | 'ok' | 'error' = !result ? 'running' : result.isError ? 'error' : 'ok'
  const Icon = open ? ChevronDown : ChevronRight
  const dotColor = status === 'running' ? 'warning' : status === 'error' ? 'danger' : 'success'
  const firstLine = result?.content.split('\n').find((l) => l.trim()) ?? ''

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen(!open)} style={styles.header}>
        <Text size="sm" color={dotColor}>
          ●
        </Text>
        <Text size="sm" weight="medium" style={styles.flex} numberOfLines={open ? undefined : 1}>
          {title}
        </Text>
        <Icon size={14} color={colors.textDim} />
      </Pressable>
      {!open && result ? (
        <Text
          size="xs"
          color={result.isError ? 'danger' : 'textMuted'}
          numberOfLines={1}
          style={styles.preview}
        >
          ⎿ {firstLine || '(sem saída)'}
        </Text>
      ) : null}
      {diff ? <DiffView lines={open ? diff : diff.slice(0, 12)} /> : null}
      {open ? (
        <View style={styles.body}>
          {use && !diff ? (
            <Text size="xs" color="textMuted" selectable>
              {JSON.stringify(use.input, null, 2)}
            </Text>
          ) : null}
          {result ? (
            <ScrollView horizontal style={styles.result}>
              <Text size="xs" color={result.isError ? 'danger' : 'text'} selectable>
                {result.content.slice(0, PREVIEW_CHARS) || '(sem saída)'}
                {result.content.length > PREVIEW_CHARS || result.truncated ? '\n… (truncado)' : ''}
              </Text>
            </ScrollView>
          ) : (
            <Text size="xs" color="warning">
              executando…
            </Text>
          )}
        </View>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.md,
    marginVertical: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  preview: { marginTop: space.xs, marginLeft: space.lg },
  body: { marginTop: space.sm, gap: space.sm },
  result: { backgroundColor: colors.background, borderRadius: radius.sm, padding: space.sm, maxHeight: 360 },
})
