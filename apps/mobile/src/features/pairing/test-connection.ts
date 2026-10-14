import {
  type ConnectionStatus,
  DaemonClient,
  type Hello,
  type SocketFactory,
} from '@/core/connection/daemon-client'
import type { Credentials } from '@/core/storage/credentials'

export type TestResult = { ok: true; hello: Hello } | { ok: false; error: string }

/** Opens a one-off connection (no retries) to check the credentials before saving them. */
export function testConnection(
  credentials: Credentials,
  options: { timeoutMs?: number; socketFactory?: SocketFactory } = {},
): Promise<TestResult> {
  return new Promise((resolve) => {
    const client = new DaemonClient({
      ...credentials,
      reconnect: false,
      socketFactory: options.socketFactory,
    })
    let settled = false
    const finish = (result: TestResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      client.close()
      resolve(result)
    }
    const timer = setTimeout(
      () => finish({ ok: false, error: 'Tempo esgotado. O Mac está no Tailscale e o daemon rodando?' }),
      options.timeoutMs ?? 8_000,
    )
    client.onReady((hello) => finish({ ok: true, hello }))
    client.onStatus((status: ConnectionStatus, error?: string) => {
      if (status === 'unauthorized') finish({ ok: false, error: 'Token recusado pelo daemon.' })
      else if (status === 'closed')
        finish({ ok: false, error: error || 'Não foi possível conectar ao daemon.' })
    })
    client.connect()
  })
}
