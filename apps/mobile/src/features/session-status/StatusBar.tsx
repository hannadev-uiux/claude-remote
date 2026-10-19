import type { SessionStatus } from '@remote-harness/protocol'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { useLimitsStore } from './limits-store'
import { formatPercent, LEVEL_COLORS, modelLabel, type StatusItem, statusItems } from './logic'
import { StatusSheet } from './StatusSheet'

type Gauge = StatusItem & { percent: number; level: NonNullable<StatusItem['level']> }

/**
 * Second context line under the session header: model chip (with the effort), provider chip
 * (dashed, when known), branch, then the context and limit gauges; hidden when nothing is known.
 * Tapping it opens the status sheet.
 */
export function StatusBar({
  status,
  profileId,
  branch = null,
  provider = null,
}: {
  status: SessionStatus | null
  profileId: string
  branch?: string | null
  /** Filled once the protocol carries the session's provider (#109). */
  provider?: string | null
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const limits = useLimitsStore((s) => s.byProfile[profileId])
  const [open, setOpen] = useState(false)
  const items = statusItems(status, limits, Date.now())
  const gauges = items.filter((item): item is Gauge => item.percent !== null && item.level !== null)
  const model = modelLabel(status)
  if (!model && !provider && !branch && gauges.length === 0) return null

  const label = (item: StatusItem) =>
    item.percent === null
      ? item.text
      : `${t(`sessionStatus.short.${item.key}`)} ${formatPercent(item.percent)}`
  const summary = [...items.map(label), branch ? t('sessions.branch', { branch }) : null]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('sessionStatus.open', { summary })}
        accessibilityHint={t('sessionStatus.openHint')}
        onPress={() => {
          // A focused composer would keep the keyboard over the sheet.
          Keyboard.dismiss()
          setOpen(true)
        }}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      >
        {model ? (
          <View style={styles.chip}>
            <Text size="xs" numberOfLines={1}>
              {model}
            </Text>
          </View>
        ) : null}
        {provider ? (
          <View style={[styles.chip, styles.dashed]}>
            <Text size="xs" color="textMuted" numberOfLines={1}>
              {t('sessionStatus.provider', { provider })}
            </Text>
          </View>
        ) : null}
        {branch ? (
          <Text
            size="xs"
            color="textMuted"
            numberOfLines={1}
            style={styles.shrink}
            accessibilityLabel={t('sessions.branch', { branch })}
          >
            ⎇ {branch}
          </Text>
        ) : null}
        {gauges.length > 0 ? (
          <Text size="xs" color="textMuted" numberOfLines={1} style={styles.gauges}>
            {gauges.map((item, index) => (
              <Fragment key={item.key}>
                {index > 0 ? <Text color="textDim"> · </Text> : null}
                {`${t(`sessionStatus.short.${item.key}`)} `}
                <Text color={LEVEL_COLORS[item.level]}>{formatPercent(item.percent)}</Text>
              </Fragment>
            ))}
          </Text>
        ) : null}
      </Pressable>
      <StatusSheet visible={open} status={status} limits={limits} onClose={() => setOpen(false)} />
    </>
  )
}

const useStyles = makeStyles((theme) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  dashed: { borderStyle: 'dashed', borderColor: theme.colors.border },
  shrink: { flexShrink: 1 },
  gauges: { flexShrink: 1, marginLeft: 'auto' },
}))
