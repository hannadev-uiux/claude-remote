import { DaemonClient, type Hello } from '@/core/connection/daemon-client'
import { credentialsStorage } from '@/core/storage/credentials'

/** Answers a permission from a notification action with a short-lived connection. */
export async function respondInBackground(requestId: string, decision: 'allow' | 'deny'): Promise<boolean> {
  const credentials = await credentialsStorage.load()
  if (!credentials) return false
  const client = new DaemonClient({ ...credentials, reconnect: false, requestTimeoutMs: 8_000 })
  try {
    await new Promise<Hello>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8_000)
      client.onReady((hello) => {
        clearTimeout(timer)
        resolve(hello)
      })
      client.onStatus((status) => {
        if (status === 'closed' || status === 'unauthorized') reject(new Error(status))
      })
      client.connect()
    })
    await client.request({ type: 'permission.respond', requestId, decision })
    return true
  } catch {
    return false
  } finally {
    client.close()
  }
}
