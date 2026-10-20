import Svg, { Path } from 'react-native-svg'
import type { AgentIconProps } from './types'

/** Placeholder mark for Codex — a plain diamond, not OpenAI's actual mark (see README). */
export function CodexIcon({ size, color }: AgentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M12 4 L20 12 L12 20 L4 12 Z" fill={color} />
    </Svg>
  )
}
