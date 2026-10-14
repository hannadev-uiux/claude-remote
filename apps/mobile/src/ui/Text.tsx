import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native'
import { type ColorName, colors, fontSize, fonts } from '@/core/theme'

export type TextProps = RNTextProps & {
  size?: keyof typeof fontSize
  color?: ColorName
  weight?: 'regular' | 'medium' | 'bold'
}

/** Monospace text with theme defaults. */
export function Text({ size = 'md', color = 'text', weight = 'regular', style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        { fontSize: fontSize[size], color: colors[color], fontFamily: fonts[weight] },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({ base: { includeFontPadding: false } })
