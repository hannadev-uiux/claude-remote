import type { RuleScope } from '@claude-remote/protocol'
import { useCallback, useState } from 'react'
import { useDaemonClient } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import { buildRespond } from './describe'
import { usePermissionsStore } from './store'

export function useRespond() {
  const client = useDaemonClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const respond = useCallback(
    async (requestId: string, decision: 'allow' | 'deny', always?: { rule: string; scope: RuleScope }) => {
      if (!client) return
      setBusy(requestId)
      setError(null)
      try {
        const { type: _t, ...payload } = buildRespond(requestId, decision, always)
        await client.request({ type: 'permission.respond', ...payload })
      } catch (e) {
        if (e instanceof DaemonRequestError && e.code === 'already_resolved') {
          // Answered elsewhere or expired: drop the card.
          usePermissionsStore.setState((s) => {
            const { [requestId]: _gone, ...rest } = s.pending
            return { pending: rest }
          })
          setError('Este pedido já foi resolvido (no Mac ou por tempo esgotado).')
        } else {
          setError((e as Error).message)
        }
      } finally {
        setBusy(null)
      }
    },
    [client],
  )
  return { respond, busy, error }
}
