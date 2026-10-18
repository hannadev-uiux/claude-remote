import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { type PromptHistoryItem, promptHistory } from '../prompt-history'
import type { StreamState } from '../store'

/** Sheet with the session's prompts, newest first; `onPick` jumps to one in the conversation. */
export function PromptHistorySheet({
  visible,
  stream,
  onPick,
  onLoadEarlier,
  onClose,
}: {
  visible: boolean
  stream: StreamState
  onPick: (item: PromptHistoryItem) => void
  onLoadEarlier: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const prompts = useMemo(
    () => promptHistory(stream.entries, (count) => t('images.count', { count })),
    [stream.entries, t],
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('promptHistory.title')}</Text>
          <Text size="xs" color="textMuted">
            {t('promptHistory.hint')}
          </Text>
          <FlatList
            data={prompts}
            keyExtractor={(item) => item.key}
            style={styles.list}
            contentContainerStyle={styles.content}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => onPick(item)}
                style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}
              >
                <Text size="sm" numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text size="sm" color="textMuted" style={styles.center}>
                {t('promptHistory.empty')}
              </Text>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {stream.hasMore ? (
                  <Button
                    label={stream.loadingOlder ? t('promptHistory.loading') : t('promptHistory.loadEarlier')}
                    variant="secondary"
                    compact
                    loading={stream.loadingOlder}
                    disabled={stream.loadingOlder}
                    onPress={onLoadEarlier}
                  />
                ) : prompts.length > 0 ? (
                  <Text size="xs" color="textDim" style={styles.center}>
                    {t('promptHistory.start')}
                  </Text>
                ) : null}
              </View>
            }
          />
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  list: { flexGrow: 0 },
  content: { gap: space.sm, paddingVertical: space.sm },
  prompt: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { borderColor: colors.accent },
  center: { textAlign: 'center', padding: space.md },
  footer: { paddingTop: space.xs },
})
