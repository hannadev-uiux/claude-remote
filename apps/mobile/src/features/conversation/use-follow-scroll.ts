import type { FlashListRef } from '@shopify/flash-list'
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { distanceFromEnd, isAtEnd, newAtEnd, SETTLE_MS, shouldFollow } from './follow'

/** Upper bound for the "new messages" jump; FlashList may take several steps to reach the end (ms). */
const JUMP_MAX_MS = 2000
/** Grace after FlashList says the jump is on its way: the final animation (ms). */
const JUMP_TAIL_MS = 400
/** Window after a drag ends in which a momentum start belongs to that drag (ms). */
const FLING_MS = 100
/**
 * A fling with no scroll event for this long is over: a tap that stops it sends no momentum end
 * (Android cancels it, iOS skips it) (ms).
 */
const IDLE_MS = 250

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

/**
 * Follows the end of a growing list (FlashList's own autoscroll is off): new content scrolls to the
 * end only when `shouldFollow` holds, never while the user drags or flings. Also tracks the "new
 * messages" button. Scroll state lives in refs: it changes on every event and must not re-render.
 * `streamKey` identifies the conversation; when it changes, everything starts over at its end.
 */
export function useFollowScroll<T>({
  listRef,
  itemCount,
  lastKey,
  streamKey,
  follow,
}: {
  listRef: RefObject<FlashListRef<T> | null>
  itemCount: number
  lastKey: string | null
  streamKey: string
  follow: boolean
}) {
  const atEnd = useRef(true)
  const dragging = useRef(false)
  const flinging = useRef(false)
  /** Time the last drag ended; a momentum start right after it is the user's fling. */
  const dragEndedAt = useRef(0)
  /** Content grew while the user scrolled; caught up when they stop at the end. */
  const grew = useRef(false)
  /** Until then, positions short of the end are the "new messages" jump in flight. */
  const jumpingUntil = useRef(0)
  /** End of the settling window after the first content; null until content arrives. */
  const settleUntil = useRef<number | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pendingScroll = useRef(false)
  const offsetY = useRef(0)
  const viewport = useRef(0)
  const previousLastKey = useRef<string | null>(null)
  /** Last item when `atEnd` was last refreshed from a size change. */
  const sizedLastKey = useRef<string | null>(null)
  const [unseen, setUnseen] = useState(false)

  const scrolling = () => dragging.current || flinging.current
  const settling = () => settleUntil.current !== null && Date.now() < settleUntil.current
  const jumping = () => Date.now() < jumpingUntil.current
  const following = () =>
    shouldFollow({ follow, atEnd: atEnd.current, scrolling: scrolling(), settling: settling() })

  /** One scroll to the end per frame, dropped if the user started scrolling meanwhile. */
  const scrollToEnd = () => {
    if (pendingScroll.current) return
    pendingScroll.current = true
    requestAnimationFrame(() => {
      pendingScroll.current = false
      if (scrolling()) return
      atEnd.current = true
      listRef.current?.scrollToEnd({ animated: false })
    })
  }

  const stopSettling = () => {
    clearTimeout(settleTimer.current)
    if (settleUntil.current !== null) settleUntil.current = 0
  }

  const updateAtEnd = (event: NativeScrollEvent, offset = event.contentOffset.y) => {
    offsetY.current = event.contentOffset.y
    viewport.current = event.layoutMeasurement.height
    const end = isAtEnd(distanceFromEnd({ ...event, contentOffset: { y: offset } }))
    if (jumping() && !end) return
    jumpingUntil.current = 0
    atEnd.current = end
    if (end) setUnseen(false)
  }

  /** The user stopped scrolling: catch up with content that arrived meanwhile, if at the end. */
  const settleAfterScroll = () => {
    if (grew.current && following()) scrollToEnd()
    grew.current = false
  }

  /** Ends a fling that never reported its end. */
  const armIdle = () => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      if (!flinging.current) return
      flinging.current = false
      settleAfterScroll()
    }, IDLE_MS)
  }

  const stopUserScroll = () => {
    dragging.current = false
    flinging.current = false
    clearTimeout(idleTimer.current)
  }

  // Another conversation in the same screen (iPad detail pane): start over at its end. A layout
  // effect, so it runs before the new conversation's first layout events.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resets the refs whenever the conversation changes.
  useLayoutEffect(() => {
    atEnd.current = true
    stopUserScroll()
    grew.current = false
    jumpingUntil.current = 0
    settleUntil.current = null
    previousLastKey.current = null
    sizedLastKey.current = null
    setUnseen(false)
    if (itemCount > 0) scrollToEnd()
    return () => {
      clearTimeout(settleTimer.current)
      clearTimeout(idleTimer.current)
    }
  }, [streamKey])

  // A new item at the end that the list will not follow shows the "new messages" button.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs only when the last item changes; `following` reads refs and the current toggle.
  useEffect(() => {
    if (newAtEnd(previousLastKey.current, lastKey) && !following() && !jumping()) setUnseen(true)
    previousLastKey.current = lastKey
  }, [lastKey])

  const scrollProps = {
    scrollEventThrottle: 16,
    onContentSizeChange: (_width: number, height: number) => {
      if (height <= 0 || itemCount === 0) return
      if (settleUntil.current === null) {
        settleUntil.current = Date.now() + SETTLE_MS
        // Item measurements can still change the height after the window: one last look.
        settleTimer.current = setTimeout(() => {
          if (!scrolling() && settleUntil.current !== 0) scrollToEnd()
        }, SETTLE_MS)
      }
      const newItems = lastKey !== sizedLastKey.current
      sizedLastKey.current = lastKey
      if (scrolling()) grew.current = true
      else if (following()) scrollToEnd()
      // New items below send no scroll event: refresh `atEnd` from the last known position. Older
      // pages (same last item) are skipped: their offset correction hides the scroll events.
      else if (newItems && viewport.current > 0 && !jumping())
        atEnd.current = isAtEnd(height - viewport.current - offsetY.current)
    },
    onLayout: (event: LayoutChangeEvent) => {
      // Keyboard, rotation, banners: keep the end in view if the user was there.
      const height = event.nativeEvent.layout.height
      const changed = viewport.current !== 0 && height !== viewport.current
      viewport.current = height
      if (changed && atEnd.current && !scrolling()) scrollToEnd()
    },
    onScrollBeginDrag: () => {
      dragging.current = true
      flinging.current = false
      clearTimeout(idleTimer.current)
      grew.current = false
      jumpingUntil.current = 0
      stopSettling()
    },
    onScrollEndDrag: ({ nativeEvent }: ScrollEvent) => {
      dragging.current = false
      dragEndedAt.current = Date.now()
      // iOS says where a fling will stop: judge the end there, not under the finger.
      updateAtEnd(nativeEvent, nativeEvent.targetContentOffset?.y)
      // A fling starts right after; only a drag released without one catches up here.
      setTimeout(() => {
        if (!flinging.current && !dragging.current) settleAfterScroll()
      }, FLING_MS)
    },
    onMomentumScrollBegin: () => {
      // Programmatic scrolls on Android emit momentum too; only a fling from the user counts.
      if (Date.now() - dragEndedAt.current >= FLING_MS) return
      flinging.current = true
      armIdle()
    },
    onMomentumScrollEnd: ({ nativeEvent }: ScrollEvent) => {
      const wasFling = flinging.current
      flinging.current = false
      clearTimeout(idleTimer.current)
      if (!wasFling) return
      updateAtEnd(nativeEvent)
      settleAfterScroll()
    },
    onScroll: ({ nativeEvent }: ScrollEvent) => {
      if (flinging.current) armIdle()
      updateAtEnd(nativeEvent)
    },
  }

  /** "New messages" button: animated jump to the end; with following on, following resumes. */
  const jumpToEnd = () => {
    stopUserScroll()
    atEnd.current = true
    jumpingUntil.current = Date.now() + JUMP_MAX_MS
    // Typed as void, but FlashList returns a promise that settles when the final scroll starts.
    const started: unknown = listRef.current?.scrollToEnd({ animated: true })
    if (started instanceof Promise)
      void started.then(
        () => {
          if (jumping()) jumpingUntil.current = Date.now() + JUMP_TAIL_MS
        },
        () => undefined,
      )
    setUnseen(false)
  }

  /** Before a programmatic jump away from the end (prompt history). */
  const leaveEnd = () => {
    stopUserScroll()
    atEnd.current = false
    jumpingUntil.current = 0
    stopSettling()
  }

  return { unseen, scrollProps, jumpToEnd, leaveEnd }
}
