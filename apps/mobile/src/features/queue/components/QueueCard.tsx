import type { QueuedMessage } from '@remote-harness/protocol'
import { ArrowUp, Pencil, X } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { Button, IconButton, Text } from '@/ui'
import { selectQueueFor, useQueueStore } from '../store'

/**
 * Dashed `QUEUED · N` card above the composer: the session's queued prompts in delivery order,
 * each with Edit (a sheet, so attachments are kept), Send now and Remove, plus `Send all now`.
 * A failed delivery shows its error on the row. Hidden when the queue is empty.
 */
export function QueueCard({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  const items = useQueueStore(selectQueueFor(sessionId))
  const [editing, setEditing] = useState<QueuedMessage | null>(null)
  const [busy, setBusy] = useState(false)
  if (items.length === 0) return null

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      Alert.alert(t('queue.actionFailed'), errorMessage(error, t))
    } finally {
      setBusy(false)
    }
  }
  const sendNow = (itemId: string) =>
    client && run(() => client.request({ type: 'queue.sendNow', sessionId, itemId }, { timeoutMs: 30_000 }))
  const remove = (itemId: string) =>
    client && run(() => client.request({ type: 'queue.remove', sessionId, itemId }))
  const flush = () =>
    client && run(() => client.request({ type: 'queue.flush', sessionId }, { timeoutMs: 90_000 }))
  const save = (itemId: string, text: string) =>
    client && run(() => client.request({ type: 'queue.update', sessionId, itemId, text }))

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text size="xs" weight="bold" color="textMuted" style={styles.title}>
          {t('queue.count', { count: items.length })}
        </Text>
        <Button
          label={t('queue.sendAll')}
          variant="ghost"
          compact
          disabled={busy}
          onPress={() => void flush()}
        />
      </View>
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <Text size="xs" color="textDim" style={styles.index}>
            {index + 1}
          </Text>
          <View style={styles.text}>
            <Text size="sm" numberOfLines={2}>
              {item.text || t('queue.withPhotos', { count: item.attachmentIds.length })}
            </Text>
            {item.text && item.attachmentIds.length > 0 ? (
              <Text size="xs" color="textDim">
                {t('queue.withPhotos', { count: item.attachmentIds.length })}
              </Text>
            ) : null}
            {item.error ? (
              <Text size="xs" color="danger" numberOfLines={2}>
                {t('queue.failed')}: {item.error}
              </Text>
            ) : null}
          </View>
          <IconButton
            icon={Pencil}
            size={16}
            label={t('queue.edit')}
            disabled={busy}
            onPress={() => setEditing(item)}
          />
          <IconButton
            icon={ArrowUp}
            size={16}
            color="accentText"
            label={t('queue.sendNow')}
            disabled={busy}
            onPress={() => void sendNow(item.id)}
          />
          <IconButton
            icon={X}
            size={16}
            label={t('queue.remove')}
            disabled={busy}
            onPress={() => void remove(item.id)}
          />
        </View>
      ))}
      <EditSheet
        item={editing}
        onCancel={() => setEditing(null)}
        onSave={(text) => {
          if (editing) void save(editing.id, text)
          setEditing(null)
        }}
      />
      {busy ? (
        <View pointerEvents="none" style={[styles.veil, { backgroundColor: colors.backdrop }]} />
      ) : null}
    </View>
  )
}

function EditSheet({
  item,
  onCancel,
  onSave,
}: {
  item: QueuedMessage | null
  onCancel: () => void
  onSave: (text: string) => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const [text, setText] = useState('')
  // The field takes the item's text each time the sheet opens for a different prompt.
  const [forItem, setForItem] = useState<string | null>(null)
  if (item && forItem !== item.id) {
    setForItem(item.id)
    setText(item.text)
  }
  const canSave = item !== null && (text.trim().length > 0 || item.attachmentIds.length > 0)
  return (
    <Modal visible={item !== null} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" accessibilityRole="header">
            {t('queue.editTitle')}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
            <Button
              label={t('queue.save')}
              variant="primary"
              disabled={!canSave}
              onPress={() => onSave(text)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  card: {
    marginHorizontal: space.sm,
    marginBottom: space.sm,
    padding: space.sm,
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  index: { width: 16, textAlign: 'right' },
  text: { flex: 1, gap: 2 },
  veil: { ...StyleSheetAbsoluteFill, borderRadius: radius.lg, opacity: 0.4 },
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    minHeight: 96,
    maxHeight: 220,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
}))

const StyleSheetAbsoluteFill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const
