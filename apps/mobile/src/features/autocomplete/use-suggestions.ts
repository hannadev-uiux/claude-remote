import type { CommandItem, FileItem } from '@remote-harness/protocol'
import { useQuery } from '@tanstack/react-query'
import { useDaemonClient, useIsConnected } from '@/core/connection'
import { useDebounced } from '@/core/utils/use-debounced'
import { filterCommands, type Trigger } from './trigger'

export function useCommands(sessionId: string) {
  const client = useDaemonClient()
  const connected = useIsConnected()
  return useQuery({
    queryKey: ['commands', sessionId],
    enabled: Boolean(client) && connected,
    staleTime: 30_000,
    queryFn: async (): Promise<CommandItem[]> => {
      const reply = await client!.request({ type: 'commands.list', sessionId })
      return reply.type === 'commands.results' ? reply.items : []
    },
  })
}

export type Suggestions =
  | { kind: 'file'; items: FileItem[]; loading: boolean }
  | { kind: 'command'; items: CommandItem[]; loading: boolean }
  | null

/** Suggestions for the trigger under the cursor (files: daemon search with debounce; commands: local filter). */
export function useSuggestions(sessionId: string, trigger: Trigger | null): Suggestions {
  const client = useDaemonClient()
  const connected = useIsConnected()
  const fileQuery = useDebounced(trigger?.kind === 'file' ? trigger.query : null, 150)
  const commands = useCommands(sessionId)

  const files = useQuery({
    queryKey: ['files', sessionId, fileQuery],
    enabled: Boolean(client) && connected && fileQuery !== null,
    staleTime: 10_000,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<FileItem[]> => {
      const reply = await client!.request({
        type: 'files.search',
        sessionId,
        query: fileQuery ?? '',
        limit: 20,
      })
      return reply.type === 'files.results' ? reply.items : []
    },
  })

  if (!trigger) return null
  if (trigger.kind === 'file') return { kind: 'file', items: files.data ?? [], loading: files.isFetching }
  return {
    kind: 'command',
    items: filterCommands(commands.data ?? [], trigger.query),
    loading: commands.isLoading,
  }
}
