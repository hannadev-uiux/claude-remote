import { StyleSheet, View } from 'react-native'
import { AGENT_BADGE_INK, AGENT_CODES, AGENT_COLORS, AGENT_NAMES, type AgentId } from '@/core/theme'
import { Text } from './Text'

/** Rounded square in the agent's fixed color with its two-letter code (20 pt in lists, 28 pt in headers). */
export function AgentBadge({ agent, size = 20 }: { agent: AgentId; size?: number }) {
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
      <Text weight="bold" style={{ fontSize: Math.round(size * 0.475), color: AGENT_BADGE_INK }}>
        {AGENT_CODES[agent]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})
