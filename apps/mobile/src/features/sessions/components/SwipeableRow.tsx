import * as Haptics from 'expo-haptics'
import type { LucideIcon } from 'lucide-react-native'
import { type ReactNode, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { runOnJS, type SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated'
import { type ColorName, radius, space, useTheme } from '@/core/theme'
import { Text } from '@/ui'

export type SwipeTone = 'danger' | 'accent' | 'info' | 'muted'

export type SwipeAction = {
  key: string
  label: string
  icon: LucideIcon
  tone: SwipeTone
  onPress: () => void
}

/** Drag past this (pt) fires the side's primary action, like messaging apps. */
export const FULL_SWIPE_PT = 150
const ACTION_WIDTH = 76

const TONES: Record<SwipeTone, { bg: ColorName; fg: ColorName }> = {
  danger: { bg: 'dangerSoft', fg: 'danger' },
  accent: { bg: 'accentSoft', fg: 'accentText' },
  info: { bg: 'infoSoft', fg: 'info' },
  muted: { bg: 'surfaceRaised', fg: 'text' },
}

/** Only one row stays open at a time. */
let openRow: SwipeableMethods | null = null

export function closeOpenRow(): void {
  openRow?.close()
  openRow = null
}

/**
 * Swipe actions around a session row. `start` actions show when swiping right (left edge) and the
 * first one fires on a full swipe; `end` actions show when swiping left (right edge) and the last
 * one fires. A full swipe closes the row again and vibrates briefly.
 */
export function SwipeableRow({
  start,
  end,
  children,
}: {
  start: SwipeAction[]
  end: SwipeAction[]
  children: ReactNode
}) {
  const ref = useRef<SwipeableMethods>(null)
  const fire = (action: SwipeAction | undefined) => {
    if (!action) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ref.current?.close()
    action.onPress()
  }
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={40}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        if (openRow && openRow !== ref.current) openRow.close()
        openRow = ref.current
      }}
      onSwipeableClose={() => {
        if (openRow === ref.current) openRow = null
      }}
      renderLeftActions={(_progress, drag) => (
        <Actions actions={start} drag={drag} side="start" onFull={() => fire(start[0])} />
      )}
      renderRightActions={(_progress, drag) => (
        <Actions actions={end} drag={drag} side="end" onFull={() => fire(end[end.length - 1])} />
      )}
    >
      {children}
    </ReanimatedSwipeable>
  )
}

function Actions({
  actions,
  drag,
  side,
  onFull,
}: {
  actions: SwipeAction[]
  drag: SharedValue<number>
  side: 'start' | 'end'
  onFull: () => void
}) {
  const { colors } = useTheme()
  const fired = useSharedValue(false)
  useAnimatedReaction(
    () => drag.value,
    (value) => {
      const past = side === 'end' ? value <= -FULL_SWIPE_PT : value >= FULL_SWIPE_PT
      if (past && !fired.value) {
        fired.value = true
        runOnJS(onFull)()
      } else if (!past && Math.abs(value) < 10) {
        fired.value = false
      }
    },
  )
  return (
    <View style={[styles.actions, side === 'start' ? styles.startSide : styles.endSide]}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={[styles.action, { backgroundColor: colors[TONES[action.tone].bg] }]}
        >
          <action.icon size={18} color={colors[TONES[action.tone].fg]} />
          <Text size="xs" weight="medium" color={TONES[action.tone].fg} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // Same outer margins as the row, so the revealed actions read as a card behind it.
  actions: { flexDirection: 'row', marginBottom: space.sm, borderRadius: radius.lg + 2, overflow: 'hidden' },
  startSide: { marginLeft: space.lg },
  endSide: { marginRight: space.lg },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: space.xs },
})
