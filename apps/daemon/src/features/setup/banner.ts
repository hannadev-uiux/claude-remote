import { stripVTControlCharacters } from 'node:util'

/** Terminal styling for the setup wizard, in the colors of the app (see apps/mobile/src/core/theme). */
export const palette = {
  accent: '#D97757',
  text: '#E8E6E3',
  muted: '#8A8784',
  frame: '#4A4744',
  danger: '#E06C75',
  success: '#98C379',
} as const

export type Paint = (color: keyof typeof palette | 'bold' | 'dim', text: string) => string

export function createPaint(enabled: boolean): Paint {
  return (color, text) => {
    if (!enabled) return text
    if (color === 'bold') return `\x1b[1m${text}\x1b[22m`
    if (color === 'dim') return `\x1b[2m${text}\x1b[22m`
    const hex = palette[color]
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`
  }
}

/** Colors only on a terminal, and never with NO_COLOR (https://no-color.org). */
export function colorEnabled(stream: { isTTY?: boolean } = process.stdout): boolean {
  return Boolean(stream.isTTY) && !process.env.NO_COLOR
}

// The app icon: a terminal window with `>_` and the Claude spark. Segments are [color, text].
type Segment = [keyof typeof palette, string]
const ICON: Segment[][] = [
  [['frame', '╭────────────────────╮']],
  [
    ['frame', '│ '],
    ['muted', '●  ●  ●'],
    ['frame', '            │'],
  ],
  [['frame', '├────────────────────┤']],
  [['frame', '│                    │']],
  [
    ['frame', '│  '],
    ['muted', '▀▄'],
    ['frame', '                │'],
  ],
  [
    ['frame', '│    '],
    ['muted', '▀▄'],
    ['frame', '              │'],
  ],
  [
    ['frame', '│    '],
    ['muted', '▄▀ ▄▄▄'],
    ['frame', '  '],
    ['accent', '▚ █ ▞'],
    ['frame', '   │'],
  ],
  [
    ['frame', '│  '],
    ['muted', '▄▀'],
    ['frame', '       '],
    ['accent', '▄▄███▄▄'],
    ['frame', '  │'],
  ],
  [
    ['frame', '│            '],
    ['accent', '▞ █ ▚'],
    ['frame', '   │'],
  ],
  [['frame', '│                    │']],
  [['frame', '╰────────────────────╯']],
  [['frame', '']],
]

const CLAUDE = [
  ' ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗',
  '██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝',
  '██║     ██║     ███████║██║   ██║██║  ██║█████╗  ',
  '██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ',
  '╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗',
  ' ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝',
]

const REMOTE = [
  '██████╗ ███████╗███╗   ███╗ ██████╗ ████████╗███████╗',
  '██╔══██╗██╔════╝████╗ ████║██╔═══██╗╚══██╔══╝██╔════╝',
  '██████╔╝█████╗  ██╔████╔██║██║   ██║   ██║   █████╗  ',
  '██╔══██╗██╔══╝  ██║╚██╔╝██║██║   ██║   ██║   ██╔══╝  ',
  '██║  ██║███████╗██║ ╚═╝ ██║╚██████╔╝   ██║   ███████╗',
  '╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝    ╚═╝   ╚══════╝',
]

const ICON_WIDTH = 22
/** Icon + gap + the widest word. */
export const BANNER_WIDTH = ICON_WIDTH + 2 + REMOTE[0]!.length

function width(text: string): number {
  return [...text].length
}

/** Rounded box like Claude Code's welcome panel. */
export function box(lines: readonly string[], paint: Paint, inner = BANNER_WIDTH - 4): string {
  const out = [paint('accent', `╭${'─'.repeat(inner + 2)}╮`)]
  for (const line of lines) {
    const visible = width(stripVTControlCharacters(line))
    out.push(
      `${paint('accent', '│')} ${line}${' '.repeat(Math.max(0, inner - visible))} ${paint('accent', '│')}`,
    )
  }
  out.push(paint('accent', `╰${'─'.repeat(inner + 2)}╯`))
  return out.join('\n')
}

/**
 * Logo (icon + CLAUDE/REMOTE) followed by the welcome box. Narrow terminals get only the box.
 */
export function renderBanner(paint: Paint, version: string, columns = 80): string {
  const welcome = box(
    [
      `${paint('accent', '✻')} ${paint('bold', 'Boas-vindas ao Claude Remote!')}`,
      '',
      paint('muted', 'Vamos preparar este Mac para você acompanhar e controlar'),
      paint('muted', 'o Claude Code pelo iPhone. Leva uns 2 minutos.'),
      '',
      paint('dim', `v${version} · ↑/↓ para escolher · Enter para confirmar · Ctrl+C sai`),
    ],
    paint,
  )
  if (columns < BANNER_WIDTH) return `\n${welcome}\n`
  const words = [...CLAUDE.map((l) => paint('text', l)), ...REMOTE.map((l) => paint('accent', l))]
  const logo = ICON.map((segments, i) => {
    const icon = segments.map(([color, text]) => paint(color, text)).join('')
    const pad = ' '.repeat(ICON_WIDTH - width(segments.map(([, t]) => t).join('')))
    return `${icon}${pad}  ${words[i] ?? ''}`.trimEnd()
  })
  return `\n${logo.join('\n')}\n\n${welcome}\n`
}
