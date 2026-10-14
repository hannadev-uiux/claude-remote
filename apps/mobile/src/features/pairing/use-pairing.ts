import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { useConnectionStore } from '@/core/connection'
import { type Credentials, credentialsStorage } from '@/core/storage/credentials'
import { testConnection } from './test-connection'

/** Tests credentials, saves them on success and enters the app. */
export function usePairing() {
  const setCredentials = useConnectionStore((s) => s.setCredentials)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pair = useCallback(
    async (credentials: Credentials) => {
      setBusy(true)
      setError(null)
      const result = await testConnection(credentials)
      if (!result.ok) {
        setError(result.error)
        setBusy(false)
        return false
      }
      await credentialsStorage.save(credentials)
      setCredentials(credentials)
      setBusy(false)
      router.replace('/')
      return true
    },
    [setCredentials],
  )

  return { pair, busy, error, setError }
}
