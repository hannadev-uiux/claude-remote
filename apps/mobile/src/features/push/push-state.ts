import { create } from 'zustand'

export type PushPermission = 'granted' | 'denied' | 'unknown'

/** What the app learned about push on this phone (fed by `usePush`, shown in Settings). */
export type PhonePush = {
  /** The build has Firebase for this platform. */
  firebase: boolean
  /** The build has a push relay URL. */
  relayConfigured: boolean
  permission: PushPermission
  /** FCM token sent to the daemon; null until registered. */
  token: string | null
  /** The registration carried a relay grant. */
  relay: boolean
}

export const usePushState = create<PhonePush>(() => ({
  firebase: false,
  relayConfigured: false,
  permission: 'unknown',
  token: null,
  relay: false,
}))
