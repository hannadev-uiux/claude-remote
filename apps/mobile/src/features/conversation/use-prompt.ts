import type { InputMode } from '@remote-harness/protocol'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import type { TFunction } from '@/core/i18n/create'
import { exceedsUploadLimit, type PreparedImage } from '../attachments/limits'

export function promptErrorMessage(error: unknown, t: TFunction, withAttachments = false): string {
  return errorMessage(error, t, {
    not_controllable: t('conversation.errors.notControllable'),
    too_large: t('conversation.errors.tooLarge'),
    // The session was there a moment ago for the upload, so a missing attachment is the likely cause.
    ...(withAttachments ? { not_found: t('attachments.errors.expired') } : {}),
  })
}

export function uploadErrorMessage(error: unknown, t: TFunction): string {
  return errorMessage(error, t, {
    not_controllable: t('conversation.errors.notControllable'),
    too_large: t('attachments.errors.tooLarge'),
    unsupported_media: t('attachments.errors.unsupported'),
    // Daemons older than attachments do not know the message.
    unknown_type: t('attachments.errors.daemonOutdated'),
  })
}

/** Prompt text, attached photos and send/keys actions for a session. Both are kept when sending fails. */
export function usePrompt(sessionId: string) {
  const client = useDaemonClient()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PreparedImage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Uploads each photo in order; returns their ids, or null after showing the error. */
  const upload = useCallback(
    async (images: PreparedImage[]): Promise<string[] | null> => {
      if (!client) return null
      const ids: string[] = []
      for (const image of images) {
        if (exceedsUploadLimit(image.base64)) {
          setError(t('attachments.errors.tooLarge'))
          return null
        }
        try {
          const reply = await client.request({
            type: 'attachment.upload',
            sessionId,
            mimeType: image.mimeType,
            data: image.base64,
          })
          if (reply.type !== 'attachment.uploaded') throw new Error(`unexpected reply ${reply.type}`)
          ids.push(reply.attachmentId)
        } catch (e) {
          setError(uploadErrorMessage(e, t))
          return null
        }
      }
      return ids
    },
    [client, sessionId, t],
  )

  /**
   * Sends (or, with `auto`, queues while the session is busy) the text and photos. `now` pastes
   * mid-turn like Claude Code's Ctrl+Enter. Resolves true when the prompt was sent or queued.
   */
  const sendText = useCallback(
    async (value: string, images: PreparedImage[] = [], mode: InputMode = 'auto') => {
      if (!client || (!value.trim() && images.length === 0)) return false
      setSending(true)
      setError(null)
      try {
        const attachmentIds = images.length > 0 ? await upload(images) : []
        if (!attachmentIds) return false
        await client.request({
          type: 'session.input',
          sessionId,
          text: value,
          mode,
          ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
        })
        return true
      } catch (e) {
        setError(promptErrorMessage(e, t, images.length > 0))
        return false
      } finally {
        setSending(false)
      }
    },
    [client, sessionId, t, upload],
  )

  const send = useCallback(
    async (mode: InputMode = 'auto') => {
      const value = text
      const images = attachments
      const ok = await sendText(value, images, mode)
      if (ok) {
        setText((current) => (current === value ? '' : current))
        setAttachments((current) => current.filter((image) => !images.includes(image)))
      }
      return ok
    },
    [sendText, text, attachments],
  )

  /** Pastes mid-turn instead of waiting in the queue (long press on Send, ⌘⏎). */
  const sendNow = useCallback(() => send('now'), [send])

  const addAttachments = useCallback((images: PreparedImage[]) => {
    setAttachments((current) => [...current, ...images])
  }, [])

  const removeAttachment = useCallback((key: string) => {
    setAttachments((current) => current.filter((image) => image.key !== key))
  }, [])

  const sendKey = useCallback(
    (key: string) => {
      client
        ?.request({ type: 'session.key', sessionId, key })
        .catch((e: unknown) => setError(errorMessage(e, t)))
    },
    [client, sessionId, t],
  )

  return {
    text,
    setText,
    attachments,
    addAttachments,
    removeAttachment,
    send,
    sendNow,
    sendText,
    sendKey,
    sending,
    error,
    setError,
  }
}
