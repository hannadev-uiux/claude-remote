import type { Profile, Session } from '@remote-harness/protocol'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'
import { Text } from '@/ui'
import { type SessionDetail, type SessionDetailKey, sessionDetails } from '../details'

const COPIED_MS = 1500

/**
 * Everything the app knows about a session, as label/value rows; paths wrap and can be copied.
 * Shared by the details sheet and the tablet inspector.
 */
export function SessionDetailsList({ session, profile }: { session: Session; profile: Profile | undefined }) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
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
    <>
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
    </>
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
  const { colors } = useTheme()
  const styles = useStyles()
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

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
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
  },
  pressed: { opacity: 0.6 },
}))
