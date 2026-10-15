import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '@/core/connection'
import { type Credentials, credentialsStorage } from '@/core/storage/credentials'
import { testConnection } from './test-connection'

/** Tests credentials, saves them on success and enters the app. */
export function usePairing() {
  const setCredentials = useConnectionStore((s) => s.setCredentials)
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pair = useCallback(
    async (credentials: Credentials) => {
      setBusy(true)
      setError(null)
      const result = await testConnection(credentials)
      if (!result.ok) {
        const message = t(`pairing.errors.${result.error}`)
        setError(result.detail ? `${message} (${result.detail})` : message)
        setBusy(false)
        return false
      }
      await credentialsStorage.save(credentials)
      setCredentials(credentials)
      setBusy(false)
      router.replace('/')
      return true
    },
    [setCredentials, t],
  )

  return { pair, busy, error, setError }
}
