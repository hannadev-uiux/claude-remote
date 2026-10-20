import Svg, { Path } from 'react-native-svg'
import type { AgentIconProps } from './types'

/** Placeholder mark for Kimi — a plain triangle, not Moonshot's actual mark (see README). */
export function KimiIcon({ size, color }: AgentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M12 4 L20 19 L4 19 Z" fill={color} />
    </Svg>
  )
}
