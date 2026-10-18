import * as SecureStore from 'expo-secure-store'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useConnectionStore } from '@/core/connection'
import { resolveMachineName, setMachineName } from '@/core/i18n/machine'

const ALIAS_KEY = 'remote-harness.machine-alias'

/** Name the user gave the paired computer in this app (null = use the host name the daemon reports). */
export const useMachineStore = create<{ alias: string | null }>(() => ({ alias: null }))

/** Loads the saved alias; called once at app start. */
export async function restoreMachineAlias(): Promise<void> {
  const saved = await SecureStore.getItemAsync(ALIAS_KEY).catch(() => null)
  useMachineStore.setState({ alias: saved?.trim() || null })
}

export async function setMachineAlias(alias: string | null): Promise<void> {
  const value = alias?.trim() || null
  useMachineStore.setState({ alias: value })
  if (value) await SecureStore.setItemAsync(ALIAS_KEY, value).catch(() => undefined)
  else await SecureStore.deleteItemAsync(ALIAS_KEY).catch(() => undefined)
}

/** The alias, else the host name from the daemon's handshake, else null (not paired or unknown). */
export function useMachineName(): string | null {
  const alias = useMachineStore((s) => s.alias)
  const host = useConnectionStore((s) => s.hello?.host)
  return resolveMachineName(alias, host)
}

/** Keeps the catalogs' `{{machine}}` in step with the connection and the alias (root layout). */
export function useMachineNameSync(): void {
  const name = useMachineName()
  useEffect(() => {
    setMachineName(name)
  }, [name])
}
