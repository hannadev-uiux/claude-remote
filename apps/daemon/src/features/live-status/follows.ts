import { type LiveFollowDevice, LiveFollowDeviceSchema } from '@remote-harness/protocol'
import { z } from 'zod'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

/** A followed session with no turn for this long is no longer followed. */
export const FOLLOW_IDLE_MS = 12 * 60 * 60_000

const FollowedSessionSchema = z.object({ sessionId: z.string().min(1), lastTurnAt: z.number() })
const FollowDeviceSchema = LiveFollowDeviceSchema.extend({
  sessions: z.array(FollowedSessionSchema).default([]),
  autoFollowProfiles: z.array(z.string()).default([]),
})
const FollowStateSchema = z.object({ devices: z.array(FollowDeviceSchema).default([]) })

export type FollowedSession = z.infer<typeof FollowedSessionSchema>
/** One phone: how to reach it, what it follows and which profiles it follows by default. */
export type FollowDevice = z.infer<typeof FollowDeviceSchema>
export type FollowState = z.infer<typeof FollowStateSchema>
export type Followed = { sessionIds: string[]; autoFollowProfiles: string[] }

export const EMPTY_FOLLOWS: FollowState = { devices: [] }

export function followExpired(lastTurnAt: number, now: number): boolean {
  return now - lastTurnAt >= FOLLOW_IDLE_MS
}

/**
 * Whether a turn of a followed session starts its live status from the daemon: not when one
 * already runs, nor while an app is in the foreground (it starts its own), nor when muted.
 */
export function shouldStartFollowed(state: {
  registered: boolean
  foreground: boolean
  muted: boolean
}): boolean {
  return !state.registered && !state.foreground && !state.muted
}

/** How the daemon starts a followed session's live status on a phone. */
export function startPlan(
  device: Pick<LiveFollowDevice, 'platform' | 'startToken'>,
): 'android' | 'push-to-start' | 'push' {
  if (device.platform === 'android') return 'android'
  return device.startToken ? 'push-to-start' : 'push'
}

const mapDevice = (
  state: FollowState,
  fcmToken: string,
  fn: (device: FollowDevice) => FollowDevice,
): FollowState => ({
  devices: state.devices.map((device) => (device.fcmToken === fcmToken ? fn(device) : device)),
})

/** Stores (or refreshes) a phone's delivery data, keeping what it follows. */
export function upsertDevice(state: FollowState, device: LiveFollowDevice): FollowState {
  const existing = state.devices.find((d) => d.fcmToken === device.fcmToken)
  const next: FollowDevice = {
    ...device,
    sessions: existing?.sessions ?? [],
    autoFollowProfiles: existing?.autoFollowProfiles ?? [],
  }
  return { devices: [...state.devices.filter((d) => d.fcmToken !== device.fcmToken), next] }
}

export function addFollow(state: FollowState, fcmToken: string, sessionId: string, now: number): FollowState {
  return mapDevice(state, fcmToken, (device) => ({
    ...device,
    sessions: [...device.sessions.filter((s) => s.sessionId !== sessionId), { sessionId, lastTurnAt: now }],
  }))
}

export function removeFollow(state: FollowState, fcmToken: string, sessionId: string): FollowState {
  return mapDevice(state, fcmToken, (device) => ({
    ...device,
    sessions: device.sessions.filter((s) => s.sessionId !== sessionId),
  }))
}

export function setAutoFollow(
  state: FollowState,
  fcmToken: string,
  profileId: string,
  enabled: boolean,
): FollowState {
  return mapDevice(state, fcmToken, (device) => {
    const others = device.autoFollowProfiles.filter((p) => p !== profileId)
    return { ...device, autoFollowProfiles: enabled ? [...others, profileId] : others }
  })
}

/** A new turn keeps the session followed for another FOLLOW_IDLE_MS on every phone. */
export function touchSession(state: FollowState, sessionId: string, now: number): FollowState {
  return {
    devices: state.devices.map((device) => ({
      ...device,
      sessions: device.sessions.map((s) => (s.sessionId === sessionId ? { ...s, lastTurnAt: now } : s)),
    })),
  }
}

/** The session ended: no phone follows it any more. */
export function dropSession(state: FollowState, sessionId: string): FollowState {
  return {
    devices: state.devices.map((device) => ({
      ...device,
      sessions: device.sessions.filter((s) => s.sessionId !== sessionId),
    })),
  }
}

export function dropExpired(state: FollowState, now: number): FollowState {
  return {
    devices: state.devices.map((device) => ({
      ...device,
      sessions: device.sessions.filter((s) => !followExpired(s.lastTurnAt, now)),
    })),
  }
}

export function followedBy(state: FollowState, fcmToken: string): Followed {
  const device = state.devices.find((d) => d.fcmToken === fcmToken)
  return {
    sessionIds: device?.sessions.map((s) => s.sessionId) ?? [],
    autoFollowProfiles: device?.autoFollowProfiles ?? [],
  }
}

/** Phones that follow the session and whose follow has not expired. */
export function followersOf(state: FollowState, sessionId: string, now: number): FollowDevice[] {
  return state.devices.filter((device) =>
    device.sessions.some((s) => s.sessionId === sessionId && !followExpired(s.lastTurnAt, now)),
  )
}

export function autoFollowersOf(state: FollowState, profileId: string): FollowDevice[] {
  return state.devices.filter((device) => device.autoFollowProfiles.includes(profileId))
}

/** The follows of every phone, in `live-follows.json` (atomic writes, survives restarts). */
export class FollowStore {
  private state: FollowState = EMPTY_FOLLOWS

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    const parsed = FollowStateSchema.safeParse(await readJsonFile(this.path).catch(() => undefined))
    this.state = parsed.success ? parsed.data : EMPTY_FOLLOWS
  }

  get(): FollowState {
    return this.state
  }

  /** Applies a change and saves it when something changed. */
  async update(change: (state: FollowState) => FollowState): Promise<FollowState> {
    const next = change(this.state)
    if (JSON.stringify(next) === JSON.stringify(this.state)) return this.state
    this.state = next
    await writeJsonAtomic(this.path, next)
    return next
  }
}
