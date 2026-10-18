import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { parseSavedTabs, rememberTab, type SavedTabs, type ToolTab } from './tool-details'

const TOOL_TABS_KEY = 'remote-harness.tool-tabs'

/** Last tab chosen per tool type in the tool call details (per device). */
export const useToolTabStore = create<{ saved: SavedTabs }>(() => ({ saved: {} }))

/** Loads the persisted tabs; called once at app start. */
export async function restoreToolTabs(): Promise<void> {
  const raw = await SecureStore.getItemAsync(TOOL_TABS_KEY).catch(() => null)
  useToolTabStore.setState({ saved: parseSavedTabs(raw) })
}

export async function saveToolTab(name: string, tab: ToolTab): Promise<void> {
  const saved = rememberTab(useToolTabStore.getState().saved, name, tab)
  useToolTabStore.setState({ saved })
  await SecureStore.setItemAsync(TOOL_TABS_KEY, JSON.stringify(saved)).catch(() => undefined)
}
