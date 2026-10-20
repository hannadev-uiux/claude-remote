import Svg, { Circle } from 'react-native-svg'
import type { AgentIconProps } from './types'

/** Placeholder mark for Claude Code — a plain filled circle, not Anthropic's actual mark (see README). */
export function ClaudeIcon({ size, color }: AgentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={12} cy={12} r={7.5} fill={color} />
    </Svg>
  )
}
