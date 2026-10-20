import Svg, { Path } from 'react-native-svg'
import type { AgentIconProps } from './types'

/** Placeholder mark for Qwen — a plain hexagon, not Alibaba's actual mark (see README). */
export function QwenIcon({ size, color }: AgentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M12 3 L19.8 7.5 L19.8 16.5 L12 21 L4.2 16.5 L4.2 7.5 Z" fill={color} />
    </Svg>
  )
}
