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

/** In the order Settings shows them (after "System"). */
export const THEME_NAMES = ['dark', 'light', 'dracula', 'mocha', 'latte'] as const
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

/** Light terminal: warm off-white surfaces, the amber accent darkened where it is text. */
export const light: Theme = {
  name: 'light',
  scheme: 'light',
  colors: {
    background: '#F3F3F1',
    surface: '#FFFFFF',
    surfaceRaised: '#F8F8F6',
    border: '#E1E0DC',
    borderStrong: '#CBC9C4',
    text: '#1B1A19',
    textMuted: '#66635F',
    textDim: '#9B9893',
    accent: '#E8A33D',
    accentText: '#A0640A',
    accentInk: '#1A1206',
    accentSoft: '#E8A33D2E',
    success: '#3F8A3A',
    successSoft: '#3F8A3A24',
    warning: '#B88A0E',
    warningSoft: '#B88A0E24',
    danger: '#C0392B',
    dangerSoft: '#C0392B1F',
    info: '#2B6FD6',
    infoSoft: '#2B6FD624',
    diffAdd: '#3F8A3A24',
    diffRemove: '#C0392B1F',
    scrim: '#000000F2',
    backdrop: '#1B1A1966',
  },
  ansi: {
    black: '#1B1A19',
    red: '#C0392B',
    green: '#3F8A3A',
    yellow: '#B88A0E',
    blue: '#2B6FD6',
    magenta: '#8E44AD',
    cyan: '#1A8A8A',
    white: '#CBC9C4',
    brightBlack: '#66635F',
    brightRed: '#C0392B',
    brightGreen: '#3F8A3A',
    brightYellow: '#B88A0E',
    brightBlue: '#2B6FD6',
    brightMagenta: '#8E44AD',
    brightCyan: '#1A8A8A',
    brightWhite: '#E1E0DC',
  },
}

/** Official Dracula palette (https://draculatheme.com/contribute), accent purple. */
export const dracula: Theme = {
  name: 'dracula',
  scheme: 'dark',
  colors: {
    background: '#282A36',
    surface: '#21222C',
    surfaceRaised: '#343746',
    border: '#44475A',
    borderStrong: '#6272A4',
    text: '#F8F8F2',
    textMuted: '#A4A8C2',
    textDim: '#6272A4',
    accent: '#BD93F9',
    accentText: '#BD93F9',
    accentInk: '#1C1526',
    accentSoft: '#BD93F92E',
    success: '#50FA7B',
    successSoft: '#50FA7B24',
    warning: '#F1FA8C',
    warningSoft: '#F1FA8C24',
    danger: '#FF5555',
    dangerSoft: '#FF555529',
    info: '#8BE9FD',
    infoSoft: '#8BE9FD24',
    diffAdd: '#50FA7B24',
    diffRemove: '#FF555529',
    scrim: '#000000F2',
    backdrop: '#000000AA',
  },
  ansi: {
    black: '#21222C',
    red: '#FF5555',
    green: '#50FA7B',
    yellow: '#F1FA8C',
    blue: '#BD93F9',
    magenta: '#FF79C6',
    cyan: '#8BE9FD',
    white: '#F8F8F2',
    brightBlack: '#6272A4',
    brightRed: '#FF6E6E',
    brightGreen: '#69FF94',
    brightYellow: '#FFFFA5',
    brightBlue: '#D6ACFF',
    brightMagenta: '#FF92DF',
    brightCyan: '#A4FFFF',
    brightWhite: '#FFFFFF',
  },
}

/** Catppuccin Mocha (https://catppuccin.com/palette), accent peach. */
export const mocha: Theme = {
  name: 'mocha',
  scheme: 'dark',
  colors: {
    background: '#1E1E2E',
    surface: '#181825',
    surfaceRaised: '#313244',
    border: '#313244',
    borderStrong: '#45475A',
    text: '#CDD6F4',
    textMuted: '#A6ADC8',
    textDim: '#6C7086',
    accent: '#FAB387',
    accentText: '#FAB387',
    accentInk: '#1E1E2E',
    accentSoft: '#FAB3872E',
    success: '#A6E3A1',
    successSoft: '#A6E3A124',
    warning: '#F9E2AF',
    warningSoft: '#F9E2AF24',
    danger: '#F38BA8',
    dangerSoft: '#F38BA829',
    info: '#89B4FA',
    infoSoft: '#89B4FA24',
    diffAdd: '#A6E3A124',
    diffRemove: '#F38BA829',
    scrim: '#000000F2',
    backdrop: '#000000AA',
  },
  ansi: {
    black: '#45475A',
    red: '#F38BA8',
    green: '#A6E3A1',
    yellow: '#F9E2AF',
    blue: '#89B4FA',
    magenta: '#F5C2E7',
    cyan: '#94E2D5',
    white: '#BAC2DE',
    brightBlack: '#585B70',
    brightRed: '#F38BA8',
    brightGreen: '#A6E3A1',
    brightYellow: '#F9E2AF',
    brightBlue: '#89B4FA',
    brightMagenta: '#F5C2E7',
    brightCyan: '#94E2D5',
    brightWhite: '#A6ADC8',
  },
}

/** Catppuccin Latte, the light flavor, accent peach (darker `accentText` for labels). */
export const latte: Theme = {
  name: 'latte',
  scheme: 'light',
  colors: {
    background: '#E6E9EF',
    surface: '#EFF1F5',
    surfaceRaised: '#FFFFFF',
    border: '#CCD0DA',
    borderStrong: '#BCC0CC',
    text: '#4C4F69',
    textMuted: '#6C6F85',
    textDim: '#9CA0B0',
    accent: '#FE640B',
    accentText: '#D14F00',
    // Dark ink: white on this peach falls just under 3:1.
    accentInk: '#1E1E2E',
    accentSoft: '#FE640B24',
    success: '#40A02B',
    successSoft: '#40A02B24',
    warning: '#DF8E1D',
    warningSoft: '#DF8E1D24',
    danger: '#D20F39',
    dangerSoft: '#D20F391F',
    info: '#1E66F5',
    infoSoft: '#1E66F524',
    diffAdd: '#40A02B24',
    diffRemove: '#D20F391F',
    scrim: '#000000F2',
    backdrop: '#4C4F6966',
  },
  ansi: {
    black: '#5C5F77',
    red: '#D20F39',
    green: '#40A02B',
    yellow: '#DF8E1D',
    blue: '#1E66F5',
    magenta: '#EA76CB',
    cyan: '#179299',
    white: '#ACB0BE',
    brightBlack: '#6C6F85',
    brightRed: '#D20F39',
    brightGreen: '#40A02B',
    brightYellow: '#DF8E1D',
    brightBlue: '#1E66F5',
    brightMagenta: '#EA76CB',
    brightCyan: '#179299',
    brightWhite: '#BCC0CC',
  },
}

/** Every theme, by name. Each is a module constant so its identity is stable (style caches key on it). */
export const THEMES: Record<ThemeName, Theme> = { dark, light, dracula, mocha, latte }

export const DEFAULT_THEME: ThemeName = 'dark'
