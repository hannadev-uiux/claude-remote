import { useCallback, useState } from 'react'
import { useDaemonClient } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'

export const PROMPT_ERRORS: Record<string, string> = {
  not_controllable: 'Sessão sem painel tmux: somente leitura.',
  too_large: 'Prompt grande demais (máx. 100 KB).',
  disconnected: 'Sem conexão com o daemon.',
  timeout: 'O daemon não respondeu.',
}

export function promptErrorMessage(error: unknown): string {
  if (error instanceof DaemonRequestError) return PROMPT_ERRORS[error.code] ?? error.message
  return error instanceof Error ? error.message : String(error)
}

/** Prompt text + send/keys actions for a session. Text is kept when sending fails. */
export function usePrompt(sessionId: string) {
  const client = useDaemonClient()
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
        setError(promptErrorMessage(e))
        return false
      } finally {
        setSending(false)
      }
    },
    [client, sessionId],
  )

  const send = useCallback(async () => {
    const value = text
    const ok = await sendText(value)
    if (ok) setText((current) => (current === value ? '' : current))
    return ok
  }, [sendText, text])

  const sendKey = useCallback(
    (key: string) => {
      client?.request({ type: 'session.key', sessionId, key }).catch((e: Error) => setError(e.message))
    },
    [client, sessionId],
  )

  return { text, setText, send, sendText, sendKey, sending, error, setError }
}
