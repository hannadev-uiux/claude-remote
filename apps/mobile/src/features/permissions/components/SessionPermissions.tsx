import type { PermissionRequestInfo } from '@claude-remote/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useConnectionStore } from '@/core/connection'
import { Text } from '@/ui'
import { selectPendingFor, usePermissionsStore } from '../store'
import { useRespond } from '../use-respond'
import { AlwaysAllowSheet } from './AlwaysAllowSheet'
import { PermissionCard } from './PermissionCard'

/** Pending permission cards for one session (oldest first) plus the always-allow sheet. */
export function SessionPermissions({
  sessionId,
  cwd,
  profileId,
}: {
  sessionId: string
  cwd: string
  profileId: string
}) {
  const { t } = useTranslation()
  const pending = usePermissionsStore(useShallow(selectPendingFor(sessionId)))
  const profileName = useConnectionStore(
    (s) => s.hello?.profiles.find((p) => p.id === profileId)?.name ?? profileId,
  )
  const { respond, busy, error } = useRespond()
  const [always, setAlways] = useState<PermissionRequestInfo | null>(null)
  const current = [...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]

  return (
    <>
      {current ? (
        <PermissionCard
          request={current}
          busy={busy === current.requestId}
          onAllow={() => void respond(current.requestId, 'allow')}
          onDeny={() => void respond(current.requestId, 'deny')}
          onAlways={() => setAlways(current)}
        />
      ) : null}
      {pending.length > 1 ? (
        <Text size="xs" color="warning" style={{ paddingHorizontal: 16 }}>
          {t('permissions.queued', { count: pending.length - 1 })}
        </Text>
      ) : null}
      {error ? (
        <Text size="xs" color="danger" style={{ paddingHorizontal: 16 }}>
          {error}
        </Text>
      ) : null}
      <AlwaysAllowSheet
        request={always}
        cwd={cwd}
        profileName={profileName}
        onCancel={() => setAlways(null)}
        onConfirm={(rule) => {
          if (always) void respond(always.requestId, 'allow', rule)
          setAlways(null)
        }}
      />
    </>
  )
}
