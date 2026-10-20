import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { useLayout } from '@/core/layout'
import { setPerformanceCollection, startTrace, stopTrace } from './perf'
import { APP_READY_TIMEOUT_MS, addStall, EMPTY_STALLS, STALL_TICK_MS, stallMs } from './stalls'
import { usePerformanceSettings } from './store'

/** When the JavaScript of this run started (this module loads with the root layout). */
const STARTED_AT = Date.now()
let appReadyRecorded = false

/** Sends `app_ready` once per run: the time to the first daemon connection, or a timeout. */
function recordAppReady(outcome: 'connected' | 'timeout'): void {
  if (appReadyRecorded) return
  appReadyRecorded = true
  stopTrace(startTrace('app_ready', { outcome }), { ready_ms: Date.now() - STARTED_AT })
}

/**
 * Applies the "Send performance data" choice and, while it is on, records `app_ready` and one
 * `js_responsiveness` trace per stretch in the foreground (stalls of the JavaScript thread, measured
 * by how late a timer fires). Traces carry numbers and the layout class only.
 */
export function usePerformanceMonitoring(): void {
  const enabled = usePerformanceSettings((s) => s.enabled)
  const loaded = usePerformanceSettings((s) => s.loaded)
  const status = useConnectionStore((s) => s.status)
  const { layout } = useLayout()
  const active = loaded && enabled

  useEffect(() => {
    if (loaded) setPerformanceCollection(enabled)
  }, [loaded, enabled])

  useEffect(() => {
    if (!loaded || appReadyRecorded) return
    // Turned off: this run's start is never measured, even if the user turns it on later.
    if (!enabled) {
      appReadyRecorded = true
      return
    }
    if (status === 'open') return recordAppReady('connected')
    const timer = setTimeout(
      () => recordAppReady('timeout'),
      Math.max(0, APP_READY_TIMEOUT_MS - (Date.now() - STARTED_AT)),
    )
    return () => clearTimeout(timer)
  }, [loaded, enabled, status])

  useEffect(() => {
    if (!active) return
    let stop: (() => void) | null = null
    const begin = () => {
      const trace = startTrace('js_responsiveness', { layout })
      let summary = EMPTY_STALLS
      let last = Date.now()
      const timer = setInterval(() => {
        const now = Date.now()
        summary = addStall(summary, stallMs(last + STALL_TICK_MS, now))
        last = now
      }, STALL_TICK_MS)
      stop = () => {
        clearInterval(timer)
        stopTrace(trace, summary)
        stop = null
      }
    }
    if (AppState.currentState === 'active') begin()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !stop) begin()
      else if (state !== 'active') stop?.()
    })
    return () => {
      subscription.remove()
      stop?.()
    }
  }, [active, layout])
}
