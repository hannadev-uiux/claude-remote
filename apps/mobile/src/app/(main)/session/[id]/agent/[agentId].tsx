import { Stack, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ConversationScreen } from '@/features/conversation/ConversationScreen'
import { useSessionsStore } from '@/features/sessions/store'
import { subagentLabel } from '@/features/subagents/sort'

/** Read-only transcript of a subagent. */
export default function SubagentRoute() {
  const { t } = useTranslation()
  const { id, agentId } = useLocalSearchParams<{ id: string; agentId: string }>()
  const all = useSessionsStore((s) => s.sessions[id]?.subagents)
  const sub = all?.find((a) => a.agentId === agentId)
  return (
    <>
      <Stack.Screen options={{ title: sub && all ? subagentLabel(sub, all, t) : t('nav.subagent') }} />
      <ConversationScreen sessionId={id} agentId={agentId} />
    </>
  )
}
