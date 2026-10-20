import type { MachinePermission, SettingsPane } from '@remote-harness/protocol'
import { useCallback, useEffect, useState } from 'react'
import { useDaemonClient, useIsConnected } from '@/core/connection'

/** The "On this computer" rows, from `machine.permissions`. `supported: false` means an older daemon. */
export function useComputerPermissions() {
  const client = useDaemonClient()
  const connected = useIsConnected()
  const [rows, setRows] = useState<MachinePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(true)

  const refresh = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const reply = await client.request({ type: 'machine.permissions' })
      setSupported(reply.type === 'machine.permissions.results')
      setRows(reply.type === 'machine.permissions.results' ? reply.permissions : [])
    } catch {
      setSupported(false)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (connected) void refresh()
  }, [connected, refresh])

  const openSettingsPane = useCallback(
    (pane: SettingsPane) => {
      client?.request({ type: 'machine.openSettingsPane', pane }).catch(() => undefined)
    },
    [client],
  )

  return { rows, loading, supported, refresh, openSettingsPane }
}
