import { firebaseInBuild } from '../error-reports/crashlytics'

type PerfModule = typeof import('@react-native-firebase/perf')
type Performance = ReturnType<PerfModule['getPerformance']>
export type Trace = ReturnType<PerfModule['trace']>

let module: PerfModule | null = null
let instance: Performance | null = null
let loaded = false
let enabled = false

/** Loads Performance Monitoring when the build has Firebase for this platform. */
function load(): Performance | null {
  if (loaded) return instance
  loaded = true
  if (!firebaseInBuild()) return null
  try {
    module = require('@react-native-firebase/perf') as PerfModule
    instance = module.getPerformance()
  } catch {
    module = null
    instance = null
  }
  return instance
}

/** Whether this build can send performance data (the setting is shown only then). */
export const performanceInBuild = () => firebaseInBuild()

/** Turns collection (custom and automatic traces) on or off for this device. */
export function setPerformanceCollection(on: boolean): void {
  const perf = load()
  enabled = on && perf !== null
  if (!perf) return
  try {
    perf.dataCollectionEnabled = on
    perf.instrumentationEnabled = on
  } catch {
    // Best effort: the setting is saved and applied again on the next start.
  }
}

/** A started custom trace, or null while collection is off. */
export function startTrace(name: string, attributes: Record<string, string> = {}): Trace | null {
  if (!enabled || !module || !instance) return null
  try {
    const trace = module.trace(instance, name)
    for (const [key, value] of Object.entries(attributes)) trace.putAttribute(key, value)
    trace.start()
    return trace
  } catch {
    return null
  }
}

/** Sets the metrics and stops the trace; failures are ignored. */
export function stopTrace(trace: Trace | null, metrics: Record<string, number> = {}): void {
  if (!trace) return
  try {
    for (const [key, value] of Object.entries(metrics)) trace.putMetric(key, value)
    trace.stop()
  } catch {
    // A trace that cannot be sent is not worth surfacing.
  }
}
