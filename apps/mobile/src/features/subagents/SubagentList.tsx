import type { SubagentInfo } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { makeStyles, space } from '@/core/theme'
import { Text } from '@/ui'
import { sortSubagents, subagentLabel } from './sort'

function open(sessionId: string, agentId: string) {
  router.push({ pathname: '/session/[id]/agent/[agentId]', params: { id: sessionId, agentId } })
}

/** Nested rows under a session in the list (max 3). */
export function NestedSubagents({ sessionId, subagents }: { sessionId: string; subagents: SubagentInfo[] }) {
  const { t } = useTranslation()
  const styles = useStyles()
  if (subagents.length === 0) return null
  const sorted = sortSubagents(subagents)
  const running = sorted.filter((s) => s.state === 'running').length
  return (
    <>
      {sorted.slice(0, 3).map((sub) => (
        <Pressable key={sub.agentId} onPress={() => open(sessionId, sub.agentId)} style={styles.nested}>
          <Text size="xs" color={sub.state === 'running' ? 'accentText' : 'textDim'} numberOfLines={1}>
            ⤷ {subagentLabel(sub)} {sub.state === 'running' ? t('subagents.running') : t('subagents.done')}
          </Text>
        </Pressable>
      ))}
      {sorted.length > 3 ? (
        <Text size="xs" color="textDim" style={styles.more}>
          {t('subagents.more', { count: sorted.length - 3, running })}
        </Text>
      ) : null}
    </>
  )
}

const useStyles = makeStyles(() => ({
  nested: {
    marginLeft: space.xl + space.lg,
    marginRight: space.lg,
    marginTop: -space.xs,
    marginBottom: space.sm,
  },
  more: { marginLeft: space.xl + space.lg, marginBottom: space.sm },
}))
