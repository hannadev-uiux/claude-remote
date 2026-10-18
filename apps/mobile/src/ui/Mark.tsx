import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { useTheme } from '@/core/theme'

type Weight = 'regular' | 'bold'

/** Geometry of the mark in a 256 box (the same source as `scripts/icons.mts`). */
const GEOMETRY: Record<
  Weight,
  {
    stroke: number
    ring: [number, number]
    stem: string
    reins: [string, string]
    node: number
    rx: number
    nodes: [number, number][]
  }
> = {
  regular: {
    stroke: 24,
    ring: [184, 34],
    stem: 'M128 150V66',
    reins: ['M111 154C104 120 88 100 60 80', 'M145 154C152 120 168 100 196 80'],
    node: 36,
    rx: 9,
    nodes: [
      [110, 34],
      [36, 52],
      [184, 52],
    ],
  },
  bold: {
    stroke: 34,
    ring: [186, 36],
    stem: 'M128 150V70',
    reins: ['M108 156C100 122 86 104 56 84', 'M148 156C156 122 170 104 200 84'],
    node: 48,
    rx: 12,
    nodes: [
      [104, 24],
      [28, 46],
      [180, 46],
    ],
  },
}

/**
 * The Remote Harness mark ("the Tether": three reins from three terminals meeting in one ring).
 * Bold under 24 pt. Drawn in the accent text color unless `color` says otherwise.
 */
export function Mark({
  size = 22,
  weight = size < 24 ? 'bold' : 'regular',
  color,
}: {
  size?: number
  weight?: Weight
  color?: string
}) {
  const { colors } = useTheme()
  const paint = color ?? colors.accentText
  const m = GEOMETRY[weight]
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessible={false}>
      <Circle cx={128} cy={m.ring[0]} r={m.ring[1]} stroke={paint} strokeWidth={m.stroke} fill="none" />
      {[m.stem, ...m.reins].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={paint}
          strokeWidth={m.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {m.nodes.map(([x, y]) => (
        <Rect key={`${x}-${y}`} x={x} y={y} width={m.node} height={m.node} rx={m.rx} fill={paint} />
      ))}
    </Svg>
  )
}
