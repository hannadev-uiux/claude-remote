import type { ServerMessageOf } from '@remote-harness/protocol'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { DaemonRequestError, useConnectionStore, useDaemonClient, useIsConnected } from '@/core/connection'

export type DirectoryRequest = { path: string; prefix?: string; hidden?: boolean; limit?: number }
/** The daemon's reply plus the request it answers (a kept previous listing may be for older text). */
export type Listing = ServerMessageOf<'directories.results'> & { request: DirectoryRequest }

/** Daemon version that answered `directories.list` with `unknown_type` (older than the feature). */
const useUnsupported = create<{ version: string | null }>(() => ({ version: null }))

/** False until the daemon says hello, and for daemons without `directories.list`. */
export function useDirectoriesSupported(): boolean {
  const version = useConnectionStore((s) => s.hello?.daemonVersion ?? null)
  const unsupported = useUnsupported((s) => s.version)
  return version !== null && version !== unsupported
}

/** `directories.list` for `request` (null disables). `keepPrevious` keeps the last listing while the next loads. */
export function useDirectories(request: DirectoryRequest | null, { keepPrevious = false } = {}) {
  const client = useDaemonClient()
  const connected = useIsConnected()
  const supported = useDirectoriesSupported()
  const version = useConnectionStore((s) => s.hello?.daemonVersion ?? null)
  return useQuery({
    queryKey: ['directories', version, request],
    enabled: Boolean(client && connected && supported && request),
    retry: false,
    staleTime: 10_000,
    ...(keepPrevious ? { placeholderData: keepPreviousData } : {}),
    queryFn: async (): Promise<Listing> => {
      try {
        const reply = await client!.request({ type: 'directories.list', ...request! })
        if (reply.type !== 'directories.results') throw new Error(`unexpected reply ${reply.type}`)
        return { ...reply, request: request! }
      } catch (error) {
        if (error instanceof DaemonRequestError && error.code === 'unknown_type') {
          useUnsupported.setState({ version })
        }
        throw error
      }
    },
  })
}
