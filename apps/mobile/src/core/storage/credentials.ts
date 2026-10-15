import * as SecureStore from 'expo-secure-store'

export type Credentials = { host: string; port: number; token: string }

const KEY = 'claude-remote.credentials'

/** Pairing credentials live only in SecureStore (iOS Keychain / Android Keystore). */
export const credentialsStorage = {
  async load(): Promise<Credentials | null> {
    const raw = await SecureStore.getItemAsync(KEY)
    if (!raw) return null
    try {
      const value = JSON.parse(raw) as Credentials
      return value.host && value.port && value.token ? value : null
    } catch {
      return null
    }
  },
  async save(credentials: Credentials): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(credentials), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    })
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY)
  },
}
