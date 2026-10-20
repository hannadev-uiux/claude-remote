import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const PUSH_TO_TALK_KEY = 'claude-remote.voice-push-to-talk'

type VoiceInteractionState = { pushToTalk: boolean }

/** "Press and hold to record": off by default (tap to start, tap again to stop). */
export const useVoiceInteractionStore = create<VoiceInteractionState>(() => ({ pushToTalk: false }))

/** Loads the persisted choice; call once before Settings renders the toggle. */
export async function restoreVoiceInteraction(): Promise<void> {
  const saved = await SecureStore.getItemAsync(PUSH_TO_TALK_KEY).catch(() => null)
  useVoiceInteractionStore.setState({ pushToTalk: saved === 'true' })
}

export async function setPushToTalk(pushToTalk: boolean): Promise<void> {
  await SecureStore.setItemAsync(PUSH_TO_TALK_KEY, String(pushToTalk))
  useVoiceInteractionStore.setState({ pushToTalk })
}
