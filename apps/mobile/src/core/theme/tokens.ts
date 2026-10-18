/** Non-color design tokens (type, spacing, radii). Colors live in `palettes.ts`, per theme. */
export const fonts = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  bold: 'JetBrainsMono_700Bold',
  italic: 'JetBrainsMono_400Regular_Italic',
} as const

export const fontSize = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 26 } as const

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const

/** Max width of conversation content (text, diffs, tool calls) in wide detail panes (iPad). */
export const maxContentWidth = 760
