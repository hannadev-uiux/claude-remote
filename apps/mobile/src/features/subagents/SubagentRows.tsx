import type { SubagentInfo } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { formatElapsed } from '@/core/utils/time'
import { useNow } from '@/core/utils/use-now'
import { Badge, Text } from '@/ui'
import { sortSubagents, subagentElapsed, subagentLabel } from './sort'

/**
 * Rows of a session's subagents, running first: label, state pill, elapsed time (live while
 * running, total once done) and tool count. Shared by the sheet and the tablet inspector.
 */
export function SubagentRows({
  subagents,
  onOpen,
}: {
  subagents: SubagentInfo[]
  onOpen: (agentId: string) => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const now = useNow(1_000)
  return (
    <>
      {sortSubagents(subagents).map((sub) => {
        const live = sub.state === 'running'
        const elapsed = subagentElapsed(sub, now)
        const detail = [
          elapsed === null ? null : formatElapsed(elapsed),
          sub.toolCount > 0 ? t('subagents.tools', { count: sub.toolCount }) : null,
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <Pressable
            key={sub.agentId}
            accessibilityRole="button"
            onPress={() => onOpen(sub.agentId)}
            style={({ pressed }) => [styles.row, live && styles.live, pressed && styles.pressed]}
          >
            <View style={styles.text}>
              <Text numberOfLines={1}>{subagentLabel(sub)}</Text>
              {detail ? (
                <Text size="xs" color={live ? 'accentText' : 'textMuted'} numberOfLines={1}>
                  {detail}
                </Text>
              ) : null}
            </View>
            <Badge
              label={live ? t('subagents.state.running') : t('subagents.state.done')}
              tone={live ? 'accent' : 'muted'}
              dot={live}
            />
          </Pressable>
        )
      })}
    </>
  )
}

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  live: { borderColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
}))
