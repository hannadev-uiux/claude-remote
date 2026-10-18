/**
 * Semantic color tokens, the same names in every theme. Fills, borders and dots use `accent`; text
 * and icons in the accent color use `accentText`; text over an accent fill uses `accentInk`.
 */
export type ThemeColors = {
  background: string
  surface: string
  surfaceRaised: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textDim: string
  /** Accent as a fill, border or dot. */
  accent: string
  /** Accent as text or icon (darker than `accent` on light surfaces). */
  accentText: string
  /** Text over an accent fill. */
  accentInk: string
  accentSoft: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  diffAdd: string
  diffRemove: string
  /** Behind full-screen media. */
  scrim: string
  /** Behind bottom sheets and modals. */
  backdrop: string
}

export type ColorName = keyof ThemeColors

/** The 16 ANSI colors of the raw terminal (xterm.js theme keys). */
export const ANSI_NAMES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const

export type AnsiColors = Record<(typeof ANSI_NAMES)[number], string>

export type ColorScheme = 'dark' | 'light'

export const THEME_NAMES = ['dark'] as const
export type ThemeName = (typeof THEME_NAMES)[number]

export type Theme = {
  name: ThemeName
  /** What system-facing pieces follow (status bar, action sheets, markdown, keyboard). */
  scheme: ColorScheme
  colors: ThemeColors
  ansi: AnsiColors
}

/** Dark terminal look inspired by the Claude Code TUI, with the amber product accent. Default. */
export const dark: Theme = {
  name: 'dark',
  scheme: 'dark',
  colors: {
    background: '#0D0D0D',
    surface: '#161616',
    surfaceRaised: '#1E1D1C',
    border: '#2A2A2A',
    borderStrong: '#3A3836',
    text: '#E8E6E3',
    textMuted: '#8A8784',
    textDim: '#5E5A56',
    accent: '#E8A33D',
    accentText: '#E8A33D',
    accentInk: '#1A1206',
    accentSoft: '#E8A33D29',
    success: '#7FB069',
    successSoft: '#7FB06926',
    warning: '#F3DC7A',
    warningSoft: '#F3DC7A26',
    danger: '#E06C75',
    dangerSoft: '#E06C7526',
    info: '#61AFEF',
    infoSoft: '#61AFEF26',
    diffAdd: '#7FB06922',
    diffRemove: '#E06C7522',
    scrim: '#000000F2',
    backdrop: '#000000AA',
  },
  ansi: {
    black: '#161616',
    red: '#E06C75',
    green: '#7FB069',
    yellow: '#E5C07B',
    blue: '#61AFEF',
    magenta: '#C678DD',
    cyan: '#56B6C2',
    white: '#E8E6E3',
    brightBlack: '#5E5A56',
    brightRed: '#E06C75',
    brightGreen: '#98C379',
    brightYellow: '#E5C07B',
    brightBlue: '#61AFEF',
    brightMagenta: '#C678DD',
    brightCyan: '#56B6C2',
    brightWhite: '#FFFFFF',
  },
}

/** Every theme, by name. Each is a module constant so its identity is stable (style caches key on it). */
export const THEMES: Record<ThemeName, Theme> = { dark }

export const DEFAULT_THEME: ThemeName = 'dark'
