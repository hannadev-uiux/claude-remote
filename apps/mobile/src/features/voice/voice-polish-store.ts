import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const VOICE_POLISH_KEY = 'claude-remote.voice-polish'

type VoicePolishState = { enabled: boolean }

/** "Polish dictation": off by default, Claude Code sessions only (see `use-voice-recording.ts`). */
export const useVoicePolishStore = create<VoicePolishState>(() => ({ enabled: false }))

/** Loads the persisted choice; call once before Settings renders the toggle. */
export async function restoreVoicePolish(): Promise<void> {
  const saved = await SecureStore.getItemAsync(VOICE_POLISH_KEY).catch(() => null)
  useVoicePolishStore.setState({ enabled: saved === 'true' })
}

export async function setVoicePolish(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(VOICE_POLISH_KEY, String(enabled))
  useVoicePolishStore.setState({ enabled })
}
