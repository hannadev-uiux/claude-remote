import type { PushRelay } from '@remote-harness/protocol'
import type { Logger } from '../../core/logger.ts'
import { buildLiveMessage, buildMulticast, type PushSender } from './sender.ts'

export type RelayFetch = (url: string, init: RequestInit) => Promise<Pick<Response, 'status'>>

const TIMEOUT_MS = 10_000

export function relaySendUrl(relay: PushRelay): string {
  return `${relay.url.replace(/\/+$/, '')}/send`
}

/**
 * Sends through the push relay when the daemon has no Firebase service account: each phone's grant
 * goes with the message and the relay picks the target from it. `410` means the token is gone;
 * phones registered without a grant (app built without a relay) get nothing.
 */
export function createRelaySender(logger: Logger, fetchImpl: RelayFetch = fetch): PushSender {
  async function post(relay: PushRelay, message: object): Promise<'ok' | 'gone' | 'failed'> {
    try {
      const response = await fetchImpl(relaySendUrl(relay), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grant: relay.grant, message }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (response.status === 410) return 'gone'
      if (response.status >= 200 && response.status < 300) return 'ok'
      logger.warn({ status: response.status }, 'push relay refused the message')
      return 'failed'
    } catch (error) {
      logger.warn({ err: error }, 'push relay unreachable')
      return 'failed'
    }
  }

  return {
    async send(targets, message) {
      // The relay sets the token from each grant.
      const { tokens: _none, ...single } = buildMulticast([], message)
      const results = await Promise.all(
        targets.map(async (target) => ({
          token: target.token,
          result: target.relay ? await post(target.relay, single) : null,
        })),
      )
      return { invalidTokens: results.flatMap((r) => (r.result === 'gone' ? [r.token] : [])) }
    },
    async sendLive(message) {
      if (!message.relay) return { invalid: false }
      const { token: _none, ...single } = buildLiveMessage(message)
      return { invalid: (await post(message.relay, single)) === 'gone' }
    },
  }
}
