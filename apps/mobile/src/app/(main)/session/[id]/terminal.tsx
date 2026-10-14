import { Stack, useLocalSearchParams } from 'expo-router'
import { TerminalScreen } from '@/features/terminal/TerminalScreen'

export default function TerminalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <>
      <Stack.Screen options={{ title: 'Terminal' }} />
      <TerminalScreen sessionId={id} />
    </>
  )
}
