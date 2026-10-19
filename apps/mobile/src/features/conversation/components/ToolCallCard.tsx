import type { TranscriptEntry } from '@remote-harness/protocol'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { Text } from '@/ui'
import { ImageStrip } from '../../images/ImageStrip'
import { diffForTool } from '../diff'
import { summarizeTool } from '../summarize-tool'
import { cutText, TOOL_TABS, type ToolTab, tabFor, toolCallJson, toolInputFields } from '../tool-details'
import { saveToolTab, useToolTabStore } from '../tool-tab-store'
import { DiffView } from './DiffView'
import { LinkifiedText } from './LinkText'

type Use = Extract<TranscriptEntry, { kind: 'tool_use' }>
type Result = Extract<TranscriptEntry, { kind: 'tool_result' }>

const RESULT_TABS: readonly ToolTab[] = ['output', 'json']

export const ToolCallCard = memo(function ToolCallCard({
  use,
  result,
}: {
  use: Use | null
  result: Result | null
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const [open, setOpen] = useState(false)
  const title = use ? summarizeTool(use.name, use.input, t) : t('conversation.toolResult')
  const diff = useMemo(() => (use ? diffForTool(use.name, use.input, t) : null), [use, t])
  const status: 'running' | 'ok' | 'error' = !result ? 'running' : result.isError ? 'error' : 'ok'
  const Icon = open ? ChevronDown : ChevronRight
  const dotColor = status === 'running' ? 'warning' : status === 'error' ? 'danger' : 'success'
  const firstLine = result?.content.split('\n').find((l) => l.trim()) ?? ''
  const images = result?.images ?? []
  const emptyText =
    images.length > 0 ? t('images.count', { count: images.length }) : t('conversation.noOutput')

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
          ⎿ {firstLine || emptyText}
        </Text>
      ) : null}
      {!open && images.length > 0 ? (
        <View style={styles.images}>
          <ImageStrip images={images} />
        </View>
      ) : null}
      {!open && diff ? <DiffView lines={diff.slice(0, 12)} /> : null}
      {open ? <ToolDetails use={use} result={result} diff={diff} /> : null}
    </View>
  )
})

/** Output / Input / JSON tabs of an expanded tool call. */
function ToolDetails({
  use,
  result,
  diff,
}: {
  use: Use | null
  result: Result | null
  diff: ReturnType<typeof diffForTool>
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const name = use?.name ?? ''
  const available = use ? TOOL_TABS : RESULT_TABS
  const saved = useToolTabStore((s) => s.saved)
  const [picked, setPicked] = useState<ToolTab | null>(null)
  const tab = picked ?? tabFor(saved, name, available)
  const [showAll, setShowAll] = useState(false)

  const choose = (next: ToolTab) => {
    setPicked(next)
    setShowAll(false)
    if (use) void saveToolTab(use.name, next)
  }

  return (
    <View style={styles.body}>
      <View style={styles.tabs}>
        {available.map((key) => (
          <Pressable
            key={key}
            onPress={() => choose(key)}
            style={[styles.tab, key === tab && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === tab }}
          >
            <Text size="xs" weight="medium" color={key === tab ? 'accentText' : 'textMuted'}>
              {t(`conversation.tabs.${key}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'output' ? (
        <>
          {diff ? <DiffView lines={diff} /> : null}
          {result ? (
            <>
              {result.content || result.images.length === 0 ? (
                <LongText
                  text={result.content || t('conversation.noOutput')}
                  color={result.isError ? 'danger' : 'text'}
                  truncated={result.truncated}
                  showAll={showAll}
                  onShowAll={() => setShowAll(true)}
                />
              ) : null}
              <ImageStrip images={result.images} />
            </>
          ) : (
            <Text size="xs" color="warning">
              {t('conversation.running')}
            </Text>
          )}
        </>
      ) : null}
      {tab === 'input' && use ? <InputFields name={use.name} input={use.input} /> : null}
      {tab === 'json' ? (
        <LongText
          text={toolCallJson(use, result)}
          color="textMuted"
          truncated={false}
          showAll={showAll}
          onShowAll={() => setShowAll(true)}
        />
      ) : null}
    </View>
  )
}

function InputFields({ name, input }: { name: string; input: Use['input'] }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const fields = useMemo(() => toolInputFields(name, input), [name, input])
  if (!fields.length) {
    return (
      <Text size="xs" color="textMuted">
        {'{}'}
      </Text>
    )
  }
  return (
    <View style={styles.fields}>
      {fields.map((f) => {
        const label = 'field' in f ? t(`tools.fields.${f.field}`) : f.key
        return (
          <View key={label} style={styles.field}>
            <Text size="xs" color="textMuted">
              {label}
            </Text>
            <LinkifiedText size="xs" selectable>
              {f.value}
            </LinkifiedText>
          </View>
        )
      })}
    </View>
  )
}

/** Monospace block cut at `TEXT_LIMIT` characters, with "Show more". */
function LongText({
  text,
  color,
  truncated,
  showAll,
  onShowAll,
}: {
  text: string
  color: 'text' | 'textMuted' | 'danger'
  truncated: boolean
  showAll: boolean
  onShowAll: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const cut = showAll ? { text, hidden: false } : cutText(text)
  return (
    <View>
      <ScrollView style={styles.block} nestedScrollEnabled>
        <ScrollView horizontal nestedScrollEnabled>
          <LinkifiedText size="xs" color={color} selectable>
            {`${cut.text}${cut.hidden ? '…' : truncated ? `\n${t('conversation.truncated')}` : ''}`}
          </LinkifiedText>
        </ScrollView>
      </ScrollView>
      {cut.hidden ? (
        <Pressable onPress={onShowAll} style={styles.more} accessibilityRole="button">
          <Text size="xs" color="accentText">
            {t('conversation.showMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  wrap: {
    marginHorizontal: space.md,
    marginVertical: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  preview: { marginTop: space.xs, marginLeft: space.lg },
  images: { marginLeft: space.lg },
  body: { marginTop: space.sm, gap: space.sm },
  tabs: { flexDirection: 'row', gap: space.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: {
    paddingVertical: space.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: theme.colors.accent },
  fields: { gap: space.sm },
  field: { gap: space.xxs },
  block: {
    backgroundColor: theme.colors.background,
    borderRadius: radius.sm,
    padding: space.sm,
    maxHeight: 480,
  },
  more: { alignSelf: 'flex-start', paddingVertical: space.xs },
}))
