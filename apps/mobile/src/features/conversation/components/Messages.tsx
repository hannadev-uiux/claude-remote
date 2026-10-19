import type { ImageRef } from '@remote-harness/protocol'
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleStop,
  CircleX,
  type LucideIcon,
} from 'lucide-react-native'
import { memo, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { type ColorName, makeStyles, radius, space, useTheme } from '@/core/theme'
import { AGENT_COLORS } from '@/core/theme/agents'
import { Text } from '@/ui'
import { ImageStrip } from '../../images/ImageStrip'
import { ConversationAgent } from '../agent-context'
import { systemText, taskStatusText, taskTone } from '../timeline'
import { CopyButton } from './CopyButton'
import { LinkifiedText } from './LinkText'
import { Markdown } from './Markdown'

export const UserMessage = memo(function UserMessage({
  text,
  images,
}: {
  text: string
  images: readonly ImageRef[]
}) {
  const { t } = useTranslation()
  const themed = useStyles()
  return (
    <View style={themed.user}>
      <Text color="accentText" weight="bold">
        {'> '}
      </Text>
      <View style={styles.flex}>
        {text ? <LinkifiedText selectable>{text}</LinkifiedText> : null}
        <ImageStrip images={images} />
      </View>
      {text.trim() ? <CopyButton value={text} label={t('conversation.copy.message')} /> : null}
    </View>
  )
})

export const AssistantMessage = memo(function AssistantMessage({ text }: { text: string }) {
  // The dot carries the agent's color; the user's `>` stays in the accent.
  const { t } = useTranslation()
  const agent = useContext(ConversationAgent)
  const { colors } = useTheme()
  const color = agent ? AGENT_COLORS[agent] : colors.accentText
  return (
    <View style={styles.assistant}>
      <Text style={[styles.bullet, { color }]}>●</Text>
      <View style={styles.flex}>
        <Markdown text={text} />
      </View>
      {text.trim() ? <CopyButton value={text} label={t('conversation.copy.message')} /> : null}
    </View>
  )
})

export const ThinkingBlock = memo(function ThinkingBlock({ text }: { text: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.thinking}>
      <View style={styles.row}>
        <Icon size={14} color={colors.textDim} />
        <Text size="sm" color="textDim" weight="regular" style={styles.italic}>
          {t('conversation.thinking')}
        </Text>
      </View>
      {open ? (
        <LinkifiedText size="sm" color="textMuted" style={styles.italic} selectable>
          {text}
        </LinkifiedText>
      ) : null}
    </Pressable>
  )
})

export const SystemLine = memo(function SystemLine({
  text: raw,
  subtype,
  durationMs,
}: {
  text: string
  subtype: string
  durationMs?: number
}) {
  const { t } = useTranslation()
  const text = systemText({ subtype, text: raw, durationMs }, t)
  const marker = COMMAND_MARKERS[subtype]
  return (
    <View style={styles.system}>
      <LinkifiedText size="xs" color={marker ? 'info' : 'textDim'} selectable>
        {`${marker ?? '·'} ${text}`}
      </LinkifiedText>
    </View>
  )
})

/** Slash commands and `!` shell commands: shown like the line typed in Claude Code. */
const COMMAND_MARKERS: Record<string, string> = { command: '›', bash_input: '!' }

const TASK_TONES: Record<ReturnType<typeof taskTone>, { icon: LucideIcon; color: ColorName }> = {
  done: { icon: CircleCheck, color: 'success' },
  failed: { icon: CircleX, color: 'danger' },
  stopped: { icon: CircleStop, color: 'warning' },
  other: { icon: CircleDashed, color: 'textMuted' },
}

/** Background task that finished, failed or was stopped; the note, if any, expands on tap. */
export const TaskNotification = memo(function TaskNotification({
  text,
  status,
  note,
}: {
  text: string
  status?: string
  note?: string
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const themed = useStyles()
  const [open, setOpen] = useState(false)
  const tone = TASK_TONES[taskTone(status)]
  const Icon = tone.icon
  const Chevron = open ? ChevronDown : ChevronRight
  const statusText = taskStatusText(status, t)
  return (
    <Pressable
      disabled={!note}
      onPress={() => setOpen(!open)}
      style={themed.task}
      accessibilityLabel={`${t('conversation.task.label')}, ${statusText}: ${text}`}
      accessibilityState={note ? { expanded: open } : undefined}
    >
      <View style={styles.taskRow}>
        <Icon size={14} color={colors[tone.color]} style={styles.taskIcon} />
        <Text size="xs" color="textMuted" style={styles.flex}>
          {statusText ? (
            <Text size="xs" color={tone.color} weight="medium">
              {`${statusText} · `}
            </Text>
          ) : null}
          {text}
        </Text>
        {note ? <Chevron size={14} color={colors.textDim} /> : null}
      </View>
      {open && note ? (
        <LinkifiedText size="xs" color="textDim" style={styles.taskNote} selectable>
          {note}
        </LinkifiedText>
      ) : null}
    </Pressable>
  )
})

/** Entry made of tags the app does not know: dimmed and collapsed, the raw text on tap. */
export const TaggedEntry = memo(function TaggedEntry({ tag, text }: { tag: string; text: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.system} accessibilityState={{ expanded: open }}>
      <Text size="xs" color="textDim">
        {open ? text : t('conversation.tagged', { tag })}
      </Text>
    </Pressable>
  )
})

export const UnknownEntry = memo(function UnknownEntry({ raw }: { raw: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.system}>
      <Text size="xs" color="textDim">
        {open ? raw : t('conversation.unknownEntry')}
      </Text>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  assistant: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  bullet: { marginTop: 3 },
  thinking: { paddingHorizontal: space.lg, paddingVertical: space.xs, gap: space.xs },
  italic: { fontStyle: 'italic' },
  system: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  taskIcon: { marginTop: 1 },
  taskNote: { marginTop: space.xs, marginLeft: 14 + space.sm },
})

const useStyles = makeStyles((theme) => ({
  user: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    marginVertical: space.sm,
    padding: space.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: radius.md,
  },
  task: {
    marginHorizontal: space.md,
    marginVertical: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
}))
