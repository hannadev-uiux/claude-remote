/** Design tokens: a dark terminal look inspired by the Claude Code TUI. */
export const colors = {
  background: '#0D0D0D',
  surface: '#161616',
  surfaceRaised: '#1E1D1C',
  border: '#2A2A2A',
  borderStrong: '#3A3836',
  text: '#E8E6E3',
  textMuted: '#8A8784',
  textDim: '#5E5A56',
  accent: '#D97757',
  accentMuted: '#D9775733',
  success: '#7FB069',
  successMuted: '#7FB06926',
  danger: '#E06C75',
  dangerMuted: '#E06C7526',
  warning: '#E5C07B',
  warningMuted: '#E5C07B26',
  info: '#61AFEF',
  infoMuted: '#61AFEF26',
  diffAdd: '#7FB06922',
  diffRemove: '#E06C7522',
  /** Behind full-screen media. */
  scrim: '#000000F2',
} as const

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

export type ColorName = keyof typeof colors
