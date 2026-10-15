import { Stack, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { TerminalScreen } from '@/features/terminal/TerminalScreen'

export default function TerminalRoute() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <>
      <Stack.Screen options={{ title: t('nav.terminal') }} />
      <TerminalScreen sessionId={id} />
    </>
  )
}
