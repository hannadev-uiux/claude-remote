import type { SessionStatus } from '@remote-harness/protocol'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet } from 'react-native'
import { colors, space } from '@/core/theme'
import { Text } from '@/ui'
import { useLimitsStore } from './limits-store'
import { formatPercent, LEVEL_COLORS, type StatusItem, statusItems } from './logic'
import { StatusSheet } from './StatusSheet'

/** Single-line model · effort · context · limits under the session header; hidden without data. */
export function StatusBar({ status, profileId }: { status: SessionStatus | null; profileId: string }) {
  const { t } = useTranslation()
  const limits = useLimitsStore((s) => s.byProfile[profileId])
  const [open, setOpen] = useState(false)
  const items = statusItems(status, limits, Date.now())
  if (items.length === 0) return null

  const label = (item: StatusItem) =>
    item.percent === null
      ? item.text
      : `${t(`sessionStatus.short.${item.key}`)} ${formatPercent(item.percent)}`
  const summary = items.map(label).join(', ')

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
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {items.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 ? <Text color="textDim"> · </Text> : null}
              {item.percent === null ? (
                <Text color={item.key === 'model' ? 'text' : 'textMuted'}>{item.text}</Text>
              ) : (
                <>
                  {`${t(`sessionStatus.short.${item.key}`)} `}
                  <Text color={LEVEL_COLORS[item.level]}>{formatPercent(item.percent)}</Text>
                </>
              )}
            </Fragment>
          ))}
        </Text>
      </Pressable>
      <StatusSheet visible={open} status={status} limits={limits} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
})
