import { Stack, usePathname } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useWidthClass } from '@/core/layout'
import { selectPendingCounts, usePermissionsStore } from '@/features/permissions/store'
import { SessionListActions } from '@/features/sessions/components/SessionListActions'
import { SessionsScreen } from '@/features/sessions/SessionsScreen'
import { EmptyState, headerActions, Text } from '@/ui'

export default function SessionsRoute() {
  const { t } = useTranslation()
  const pending = usePermissionsStore(useShallow(selectPendingCounts))
  const widthClass = useWidthClass()
  // The stack keeps the list mounted under a session: the arrows only move it while it is shown.
  const visible = usePathname() === '/'
  // In regular width the list is already visible in the master pane; this route is the detail pane.
  if (widthClass === 'regular') {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState title={t('sessions.detailEmptyTitle')}>
          <Text color="textMuted">{t('sessions.detailEmptyBody')}</Text>
        </EmptyState>
      </>
    )
  }
  return (
    <>
      <Stack.Screen options={headerActions(<SessionListActions newSession={false} />)} />
      <SessionsScreen pendingBySession={pending} interactive={visible} fab />
    </>
  )
}
