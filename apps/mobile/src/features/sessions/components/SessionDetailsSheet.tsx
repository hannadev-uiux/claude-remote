import type { Profile, Session } from '@remote-harness/protocol'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { type SessionDetail, type SessionDetailKey, sessionDetails } from '../details'

const COPIED_MS = 1500

/** Bottom sheet with everything the app knows about a session; paths wrap and can be copied. */
export function SessionDetailsSheet({
  visible,
  session,
  profile,
  onClose,
}: {
  visible: boolean
  session: Session
  profile: Profile | undefined
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const [copied, setCopied] = useState<SessionDetailKey | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const rows = sessionDetails(session, profile, t, { locale: i18n.language })

  const copy = async (row: SessionDetail) => {
    const ok = await Clipboard.setStringAsync(row.value).catch(() => false)
    if (!ok) return
    clearTimeout(timer.current)
    setCopied(row.key)
    AccessibilityInfo.announceForAccessibility(t('sessionDetails.copied'))
    timer.current = setTimeout(() => setCopied(null), COPIED_MS)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" accessibilityRole="header">
            {t('sessionDetails.title')}
          </Text>
          <Text size="sm" color="textMuted" selectable>
            {session.title || t('common.session')}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.content}>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View style={styles.text}>
                  <Text size="xs" color="textMuted">
                    {row.label}
                  </Text>
                  <Text size="sm" selectable>
                    {row.value}
                  </Text>
                </View>
                {row.copyLabel ? (
                  <CopyButton
                    label={row.copyLabel}
                    text={copied === row.key ? t('sessionDetails.copied') : t('sessionDetails.copy')}
                    done={copied === row.key}
                    onPress={() => void copy(row)}
                  />
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function CopyButton({
  label,
  text,
  done,
  onPress,
}: {
  label: string
  text: string
  done: boolean
  onPress: () => void
}) {
  const Icon = done ? Check : Copy
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
    >
      <Icon size={14} color={done ? colors.success : colors.textMuted} strokeWidth={2} />
      <Text size="xs" color={done ? 'success' : 'textMuted'}>
        {text}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
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
  content: { paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1, gap: space.xxs },
  copy: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
})
