import type { PermissionAnswer, RuleScope } from '@claude-remote/protocol'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDaemonClient } from '@/core/connection'
import { type DaemonClient, DaemonRequestError } from '@/core/connection/daemon-client'
import { errorMessage } from '@/core/connection/error-message'
import { buildRespond } from './describe'
import { usePermissionsStore } from './store'

export function useRespond() {
  const client = useDaemonClient()
  const { t } = useTranslation()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(
    async (requestId: string, request: (client: DaemonClient) => Promise<unknown>) => {
      if (!client) return
      setBusy(requestId)
      setError(null)
      try {
        await request(client)
      } catch (e) {
        if (e instanceof DaemonRequestError && e.code === 'already_resolved') {
          // Answered elsewhere or expired: drop the card.
          usePermissionsStore.setState((s) => {
            const { [requestId]: _gone, ...rest } = s.pending
            return { pending: rest }
          })
          setError(t('permissions.alreadyResolved'))
        } else {
          setError(errorMessage(e, t))
        }
      } finally {
        setBusy(null)
      }
    },
    [client, t],
  )

  const respond = useCallback(
    (requestId: string, decision: 'allow' | 'deny', always?: { rule: string; scope: RuleScope }) =>
      send(requestId, (c) => {
        const { type: _t, ...payload } = buildRespond(requestId, decision, always)
        return c.request({ type: 'permission.respond', ...payload })
      }),
    [send],
  )

  /** Answers a question or plan approval (`interaction` requests). */
  const answer = useCallback(
    (requestId: string, value: PermissionAnswer) =>
      send(requestId, (c) => c.request({ type: 'permission.answer', requestId, answer: value })),
    [send],
  )

  return { respond, answer, busy, error }
}
