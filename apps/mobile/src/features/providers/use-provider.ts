import { useQuery } from '@tanstack/react-query'
import { useDaemonClient, useIsConnected } from '@/core/connection'

/** `models.list` of a profile (`null` disables). The daemon caches the catalog, so a long stale time is fine. */
export function useModels(profileId: string | null) {
  const client = useDaemonClient()
  const connected = useIsConnected()
  return useQuery({
    queryKey: ['models', profileId],
    enabled: Boolean(client && connected && profileId),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const reply = await client!.request(
        { type: 'models.list', profileId: profileId! },
        { timeoutMs: 20_000 },
      )
      if (reply.type !== 'models.results') throw new Error(`unexpected reply ${reply.type}`)
      return reply
    },
  })
}

/** `provider.status` of a profile: whether a key is stored on the computer and the credits left. */
export function useProviderStatus(profileId: string | null) {
  const client = useDaemonClient()
  const connected = useIsConnected()
  return useQuery({
    queryKey: ['provider', profileId],
    enabled: Boolean(client && connected && profileId),
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const reply = await client!.request(
        { type: 'provider.status', profileId: profileId! },
        { timeoutMs: 20_000 },
      )
      if (reply.type !== 'provider.info') throw new Error(`unexpected reply ${reply.type}`)
      return reply
    },
  })
}
