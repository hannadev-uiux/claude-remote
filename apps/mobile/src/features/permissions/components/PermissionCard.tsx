import type { PermissionRequestInfo } from '@claude-remote/protocol'
import { ShieldAlert } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { describePermission, secondsLeft } from '../describe'

type Props = {
  request: PermissionRequestInfo
  busy: boolean
  onAllow: () => void
  onAlways: () => void
  onDeny: () => void
}

function useCountdown(expiresAt: string) {
  const [left, setLeft] = useState(() => secondsLeft(expiresAt))
  useEffect(() => {
    const timer = setInterval(() => setLeft(secondsLeft(expiresAt)), 1000)
    return () => clearInterval(timer)
  }, [expiresAt])
  return left
}

export function PermissionCard({ request, busy, onAllow, onAlways, onDeny }: Props) {
  const { t } = useTranslation()
  const d = describePermission(request, t)
  const left = useCountdown(request.expiresAt)
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ShieldAlert size={16} color={colors.warning} />
        <Text weight="bold" color="warning" style={styles.flex} numberOfLines={1}>
          {d.title}
        </Text>
        <Text size="xs" color={left < 30 ? 'danger' : 'textMuted'}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </Text>
      </View>
      <Text size="xs" color="textMuted">
        {d.detailLabel}
      </Text>
      <ScrollView style={styles.detail} nestedScrollEnabled>
        <Text size="sm" selectable>
          {d.detail}
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <Button
          label={t('permissions.deny')}
          variant="danger"
          compact
          flex
          disabled={busy}
          onPress={onDeny}
        />
        <Button label={t('permissions.always')} compact flex disabled={busy} onPress={onAlways} />
        <Button
          label={t('permissions.allow')}
          variant="success"
          compact
          flex
          loading={busy}
          onPress={onAllow}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    margin: space.sm,
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  detail: { maxHeight: 120, backgroundColor: colors.background, borderRadius: radius.sm, padding: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
})
