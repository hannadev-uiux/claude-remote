import Svg, { Path } from 'react-native-svg'
import type { AgentIconProps } from './types'

/** Placeholder mark for OpenRouter — a plain outlined fork/branch, not its actual mark (see README). */
export function OpenRouterIcon({ size, color }: AgentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M12 5 V12 M12 12 L6 18 M12 12 L18 18"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}
