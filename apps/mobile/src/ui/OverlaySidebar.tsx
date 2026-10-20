import { type ReactNode, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { dragProgress, EDGE_SWIPE_WIDTH, settlesOpen } from '@/core/layout'
import { useTheme } from '@/core/theme'

export const SIDEBAR_WIDTH = 340

/** Instant when the system asks for reduced motion. */
const SLIDE = { duration: 220, reduceMotion: ReduceMotion.System }
/** The edge strip starts below the header, so it never takes the ☰ tap. */
const HEADER_CLEARANCE = 56

/** Slides to open (1) or hidden (0); `onHidden` runs once a close actually finishes. */
function slideTo(progress: SharedValue<number>, open: boolean, onHidden: () => void): void {
  'worklet'
  progress.value = withTiming(open ? 1 : 0, SLIDE, (finished) => {
    if (finished && !open) scheduleOnRN(onHidden)
  })
}

/**
 * The session list sliding over the dimmed conversation (tablet portrait). `open` slides it in and
 * out; a rightward swipe from the left edge (`edgeSwipe`) opens it following the finger, and a
 * leftward swipe or a tap on the dimmed area closes it. Swipes on the list stay with its rows. The
 * list is mounted only while open, dragged or closing.
 */
export function OverlaySidebar({
  open,
  edgeSwipe,
  onOpen,
  onClose,
  children,
}: {
  open: boolean
  edgeSwipe: boolean
  onOpen: () => void
  onClose: () => void
  children: ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const progress = useSharedValue(open ? 1 : 0)
  const [mounted, setMounted] = useState(open)
  const hide = () => setMounted(false)

  useEffect(() => {
    if (open) setMounted(true)
    progress.value = withTiming(open ? 1 : 0, SLIDE, (finished) => {
      if (finished && !open) scheduleOnRN(setMounted, false)
    })
  }, [open, progress])

  const openPan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetX(-8)
    .failOffsetY([-16, 16])
    .onStart(() => {
      scheduleOnRN(setMounted, true)
    })
    .onUpdate((e) => {
      progress.value = dragProgress(0, e.translationX, SIDEBAR_WIDTH)
    })
    .onEnd((e) => {
      const stay = settlesOpen(progress.value, e.velocityX)
      slideTo(progress, stay, hide)
      if (stay) scheduleOnRN(onOpen)
    })

  const closePan = Gesture.Pan()
    .activeOffsetX(-12)
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      progress.value = dragProgress(1, e.translationX, SIDEBAR_WIDTH)
    })
    .onEnd((e) => {
      const stay = settlesOpen(progress.value, e.velocityX)
      slideTo(progress, stay, hide)
      if (!stay) scheduleOnRN(onClose)
    })

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * SIDEBAR_WIDTH }],
  }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

  return (
    <>
      {edgeSwipe && !open ? (
        <GestureDetector gesture={openPan}>
          <View collapsable={false} style={[styles.edge, { top: insets.top + HEADER_CLEARANCE }]} />
        </GestureDetector>
      ) : null}
      {mounted ? (
        <>
          <GestureDetector gesture={closePan}>
            <Animated.View style={[styles.fill, backdropStyle]}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={[styles.fill, { backgroundColor: colors.backdrop }]}
              />
            </Animated.View>
          </GestureDetector>
          <Animated.View style={[styles.panel, panelStyle]}>
            <SafeAreaView
              edges={['top', 'left', 'bottom']}
              style={[
                styles.content,
                { backgroundColor: colors.background, borderRightColor: colors.border },
              ]}
            >
              {children}
            </SafeAreaView>
          </Animated.View>
        </>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, bottom: 0, width: EDGE_SWIPE_WIDTH },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, width: SIDEBAR_WIDTH },
  content: { flex: 1, borderRightWidth: 1 },
})
