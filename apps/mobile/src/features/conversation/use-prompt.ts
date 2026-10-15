import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import type { TFunction } from '@/core/i18n/create'

export function promptErrorMessage(error: unknown, t: TFunction): string {
  return errorMessage(error, t, {
    not_controllable: t('conversation.errors.notControllable'),
    too_large: t('conversation.errors.tooLarge'),
  })
}

/** Prompt text + send/keys actions for a session. Text is kept when sending fails. */
export function usePrompt(sessionId: string) {
  const client = useDaemonClient()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendText = useCallback(
    async (value: string) => {
      if (!client || !value.trim()) return false
      setSending(true)
      setError(null)
      try {
        await client.request({ type: 'session.input', sessionId, text: value })
        return true
      } catch (e) {
        setError(promptErrorMessage(e, t))
        return false
      } finally {
        setSending(false)
      }
    },
    [client, sessionId, t],
  )

  const send = useCallback(async () => {
    const value = text
    const ok = await sendText(value)
    if (ok) setText((current) => (current === value ? '' : current))
    return ok
  }, [sendText, text])

  const sendKey = useCallback(
    (key: string) => {
      client
        ?.request({ type: 'session.key', sessionId, key })
        .catch((e: unknown) => setError(errorMessage(e, t)))
    },
    [client, sessionId, t],
  )

  return { text, setText, send, sendText, sendKey, sending, error, setError }
}
