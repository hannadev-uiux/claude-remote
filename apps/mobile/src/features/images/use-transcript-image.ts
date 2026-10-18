import { type ImageRef, MAX_TRANSCRIPT_IMAGE_BYTES } from '@remote-harness/protocol'
import { createContext, useContext, useEffect, useState } from 'react'
import { useDaemonClient, useIsConnected } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import { CancelledError, dataUri, FetchQueue, ImageCache, imageTimeoutMs } from './image-cache'

/** The conversation whose transcript the image refs belong to (set by the conversation screen). */
export type ImageSource = { sessionId: string; agentId?: string }
export const TranscriptImagesContext = createContext<ImageSource | null>(null)

/** About 24 MB of images, as base64. */
const cache = new ImageCache(32 * 1024 * 1024)
const queue = new FetchQueue(2)

export type ImageState =
  | { status: 'loading' }
  | { status: 'ready'; uri: string }
  | { status: 'failed' }
  | { status: 'tooLarge' }

function initial(key: string | null, tooLarge: boolean): ImageState {
  if (tooLarge) return { status: 'tooLarge' }
  const uri = key ? cache.get(key) : undefined
  return uri ? { status: 'ready', uri } : { status: 'loading' }
}

/**
 * Data of a transcript image, fetched with `transcript.image` when the component mounts (so only
 * for thumbnails near the viewport), at most two at a time, newest first, and cached in memory. A
 * fetch nobody waits for any more (the thumbnail scrolled away) is dropped before it starts. While
 * the daemon is unreachable it stays `loading` and fetches once the connection is back; `retry`
 * tries a failed image again.
 */
export function useTranscriptImage(image: ImageRef): { state: ImageState; retry: () => void } {
  const source = useContext(TranscriptImagesContext)
  const client = useDaemonClient()
  const connected = useIsConnected()
  const key = source ? `${source.sessionId}#${source.agentId ?? ''}|${image.id}` : null
  const tooLarge = image.bytes > MAX_TRANSCRIPT_IMAGE_BYTES
  const [state, setState] = useState<ImageState>(() => initial(key, tooLarge))
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the fetch on retry.
  useEffect(() => {
    const now = initial(key, tooLarge)
    setState(now)
    if (now.status !== 'loading' || !key || !source || !client || !connected) return
    let alive = true
    const job = queue.run(key, async () => {
      const reply = await client.request(
        {
          type: 'transcript.image',
          sessionId: source.sessionId,
          ...(source.agentId ? { agentId: source.agentId } : {}),
          imageId: image.id,
        },
        { timeoutMs: imageTimeoutMs(image.bytes) },
      )
      if (reply.type !== 'transcript.image') throw new Error(`unexpected reply ${reply.type}`)
      const uri = dataUri(reply.mediaType, reply.data)
      cache.set(key, uri)
      return uri
    })
    job.promise.then(
      (uri) => alive && setState({ status: 'ready', uri }),
      (error: unknown) => {
        // Dropped or disconnected: stays loading; the effect runs again when it matters.
        if (!alive || error instanceof CancelledError) return
        if (error instanceof DaemonRequestError && error.code === 'disconnected') return
        const large = error instanceof DaemonRequestError && error.code === 'too_large'
        setState({ status: large ? 'tooLarge' : 'failed' })
      },
    )
    return () => {
      alive = false
      job.release()
    }
  }, [key, tooLarge, source, client, connected, image.id, image.bytes, attempt])

  return { state, retry: () => setAttempt((n) => n + 1) }
}
