import { StyleSheet, View } from 'react-native'
import { AGENT_BADGE_INK, AGENT_CODES, AGENT_COLORS, AGENT_NAMES, type AgentId } from '@/core/theme'
import { agentIconFor } from './agent-icons'
import { Text } from './Text'

/** Rounded square in the agent's fixed color with its icon (or, without one yet, its two-letter code). */
export function AgentBadge({ agent, size = 20 }: { agent: AgentId; size?: number }) {
  const Icon = agentIconFor(agent)
  return (
    <View
      accessible
      accessibilityLabel={AGENT_NAMES[agent]}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 4),
          backgroundColor: AGENT_COLORS[agent],
        },
      ]}
    >
      {Icon ? (
        <Icon size={Math.round(size * 0.6)} color={AGENT_BADGE_INK} />
      ) : (
        <Text weight="bold" style={{ fontSize: Math.round(size * 0.475), color: AGENT_BADGE_INK }}>
          {AGENT_CODES[agent]}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})
