import type { ImageRef } from '@remote-harness/protocol'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { ImageStrip } from '../../images/ImageStrip'
import { systemText } from '../timeline'
import { Markdown } from './Markdown'

export const UserMessage = memo(function UserMessage({
  text,
  images,
}: {
  text: string
  images: readonly ImageRef[]
}) {
  return (
    <View style={styles.user}>
      <Text color="accent" weight="bold">
        {'> '}
      </Text>
      <View style={styles.flex}>
        {text ? <Text selectable>{text}</Text> : null}
        <ImageStrip images={images} />
      </View>
    </View>
  )
})

export const AssistantMessage = memo(function AssistantMessage({ text }: { text: string }) {
  return (
    <View style={styles.assistant}>
      <Text color="accent" style={styles.bullet}>
        ●
      </Text>
      <View style={styles.flex}>
        <Markdown text={text} />
      </View>
    </View>
  )
})

export const ThinkingBlock = memo(function ThinkingBlock({ text }: { text: string }) {
  const { t } = useTranslation()
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
        <Text size="sm" color="textMuted" style={styles.italic} selectable>
          {text}
        </Text>
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
  return (
    <View style={styles.system}>
      <Text size="xs" color={subtype === 'command' ? 'info' : 'textDim'} selectable>
        {subtype === 'command' ? `› ${text}` : `· ${text}`}
      </Text>
    </View>
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
  user: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    marginVertical: space.sm,
    padding: space.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  assistant: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  bullet: { marginTop: 3 },
  thinking: { paddingHorizontal: space.lg, paddingVertical: space.xs, gap: space.xs },
  italic: { fontStyle: 'italic' },
  system: { paddingHorizontal: space.lg, paddingVertical: space.xs },
})
