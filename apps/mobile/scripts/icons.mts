/**
 * Generates the brand assets from code so the artwork stays reviewable and reproducible. One mark,
 * "the Tether" (three reins from three terminals meeting in one ring, see docs/design/identity),
 * in two weights: regular for the app icon, splash and banner; bold under 24 px (notification,
 * favicon, Live Activity, tray). Outputs: `assets/*.png` + `assets/icon/*.svg` (app), the Linux tray
 * glyph next to `tray.py`, `docs/brand/og.png` (README header, Open Graph) and the Google Play
 * feature graphic in `store/`.
 * Run: pnpm --filter @remote-harness/mobile icons
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype, { type Font } from 'opentype.js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'assets')
const repo = join(here, '..', '..', '..')
const brand = join(repo, 'docs', 'brand')
const linuxTray = join(repo, 'apps', 'daemon', 'tray', 'linux')
const store = join(here, '..', 'store')

// Dark theme and brand colors (apps/mobile/src/core/theme/palettes.ts, agents.ts).
const ACCENT = '#E8A33D'
const BG = '#0D0D0D'
const BG_TOP = '#1C1A17'
const TEXT = '#E8E6E3'
const MUTED = '#8A8784'
const BORDER_STRONG = '#3A3836'
const INK = '#1A1206'
const WHITE = '#FFFFFF'
/** Standard fill of GTK symbolic icons, recolored by the theme. */
const SYMBOLIC = '#BEBEBE'
const AGENTS = { claude: '#D97757', codex: '#2FBF8F' } as const

type Weight = 'regular' | 'bold'

/** Geometry of the mark in a 256 × 256 box (from docs/design/identity/shared.js). */
const MARK: Record<
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

/** The mark drawn in its 256 box: reins and ring stroked, nodes filled. */
function mark(weight: Weight, color: string): string {
  const m = MARK[weight]
  const [cy, r] = m.ring
  const nodes = m.nodes
    .map(
      ([x, y]) =>
        `<rect x="${x}" y="${y}" width="${m.node}" height="${m.node}" rx="${m.rx}" fill="${color}"/>`,
    )
    .join('')
  return `<g fill="none" stroke="${color}" stroke-width="${m.stroke}" stroke-linecap="round" stroke-linejoin="round"><circle cx="128" cy="${cy}" r="${r}"/><path d="${m.stem}"/><path d="${m.reins[0]}"/><path d="${m.reins[1]}"/></g>${nodes}`
}

/** The mark scaled into a `size` box whose top-left corner is (x, y). */
function markAt(weight: Weight, color: string, x: number, y: number, size: number): string {
  return `<g transform="translate(${x} ${y}) scale(${(size / 256).toFixed(4)})">${mark(weight, color)}</g>`
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

/** Dark vertical gradient behind the mark — flat, no glow (keeps the mark crisp at small sizes). */
function backdrop(id: string): { defs: string; rects: string } {
  return {
    defs: `<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG}"/></linearGradient>`,
    rects: `<rect width="100%" height="100%" fill="url(#${id}-bg)"/>`,
  }
}

/** Standalone mark, for the SVG sources and the docs. */
const markSvg = (weight: Weight, color = ACCENT) => svg(256, 256, mark(weight, color))

/** App icon (iOS, macOS bundle, favicon, Live Activity): the mark in a 640 box over the backdrop. */
function iconSvg(weight: Weight = 'regular'): string {
  const { defs, rects } = backdrop('icon')
  return svg(1024, 1024, `<defs>${defs}</defs>${rects}${markAt(weight, ACCENT, 192, 182, 640)}`)
}

/** Android adaptive foreground: the mark inside the 66 % safe zone, background from app.config. */
function adaptiveForegroundSvg(color = ACCENT): string {
  const inset = (1024 * 18) / 108
  return svg(1024, 1024, markAt('regular', color, inset, inset, 1024 - 2 * inset))
}

/**
 * Background and accent of each theme that gets its own alternate app icon (#233), matching
 * `src/core/theme/palettes.ts` (duplicated here for the same reason as `ACCENT`/`BG` above: this
 * script runs in Node, outside the app's module graph).
 */
const ICON_THEMES = {
  dark: { bg: '#0D0D0D', accent: '#E8A33D' },
  light: { bg: '#F3F3F1', accent: '#E8A33D' },
  dracula: { bg: '#282A36', accent: '#BD93F9' },
  mocha: { bg: '#1E1E2E', accent: '#FAB387' },
  latte: { bg: '#E6E9EF', accent: '#FE640B' },
} as const

/** Flat alternate app icon for a theme: solid background, the mark in the theme's accent, no glow. */
function themedIconSvg(bg: string, accent: string): string {
  return svg(
    1024,
    1024,
    `<rect width="100%" height="100%" fill="${bg}"/>${markAt('regular', accent, 192, 182, 640)}`,
  )
}

/** Bold mark in white on transparent: Android themed (monochrome) icon and the notification icon. */
function monochromeSvg(inset: number): string {
  return svg(1024, 1024, markAt('bold', WHITE, inset, inset, 1024 - 2 * inset))
}

/** Splash: the regular mark alone; Expo paints the dark background. */
const splashSvg = () => svg(1024, 1024, markAt('regular', ACCENT, 192, 192, 640))

/** Linux tray: symbolic SVG (themes recolor the standard gray), looked up by name next to tray.py. */
const symbolicSvg = () =>
  svg(
    22,
    22,
    `<title>Remote Harness</title><g transform="scale(${(22 / 256).toFixed(5)})">${mark('bold', SYMBOLIC)}</g>`,
  )

// --- Banner -------------------------------------------------------------------------------------

// The SVG renderer only knows the fonts installed on the machine, so banner texts are converted to
// outlines with opentype.js from the font files bundled with the app (JetBrains Mono).
const require = createRequire(import.meta.url)
const fontsDir = dirname(require.resolve('@expo-google-fonts/jetbrains-mono/package.json'))
function loadFont(file: string): Font {
  const bytes = readFileSync(join(fontsDir, file))
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}
const FONTS: Record<Weight, Font> = {
  regular: loadFont(join('400Regular', 'JetBrainsMono_400Regular.ttf')),
  bold: loadFont(join('700Bold', 'JetBrainsMono_700Bold.ttf')),
}

/**
 * Path data from the outline commands, two decimals. opentype's own `toPathData()` rounds through
 * exponent strings and turns some coordinates into `NaN`, which stops the rasterizer mid-glyph.
 */
function pathData(path: opentype.Path): string {
  const n = (value: number | undefined) => String(Math.round((value ?? 0) * 100) / 100)
  return path.commands
    .map((c) => {
      if (c.type === 'Z') return 'Z'
      if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
      if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
      return `${c.type}${n(c.x)} ${n(c.y)}`
    })
    .join('')
}

/** A text run as a filled path, baseline at (x, y), `size` in pixels. */
function text(content: string, weight: Weight, size: number, color: string, x: number, y: number): string {
  const d = pathData(FONTS[weight].getPath(content, x, y, size, { kerning: true }))
  return `<path d="${d}" fill="${color}"/>`
}

const textWidth = (content: string, weight: Weight, size: number) =>
  FONTS[weight].getAdvanceWidth(content, size, { kerning: true })

/**
 * Small drawn glyphs for the banner's agent chips, replacing the `cl`/`cx` letter codes with
 * something closer to a mark while #226 (official brand assets) is still open. Same technique as
 * the Tether mark itself (stroked lines, filled nodes) rather than an imported logo.
 */
const AGENT_GLYPHS: Record<'claude' | 'codex', (color: string, cx: number, cy: number, r: number) => string> =
  {
    /** Three crossing strokes through the center, echoing the Tether's reins. */
    claude: (color, cx, cy, r) =>
      `<g stroke="${color}" stroke-width="${(r / 3.4).toFixed(2)}" stroke-linecap="round">${[0, 60, 120]
        .map((deg) => {
          const rad = (deg * Math.PI) / 180
          const dx = r * Math.cos(rad)
          const dy = r * Math.sin(rad)
          return `<line x1="${(cx - dx).toFixed(2)}" y1="${(cy - dy).toFixed(2)}" x2="${(cx + dx).toFixed(2)}" y2="${(cy + dy).toFixed(2)}"/>`
        })
        .join('')}</g>`,
    /** Six nodes around a ring, echoing the Tether's own node-and-ring language. */
    codex: (color, cx, cy, r) =>
      Array.from({ length: 6 }, (_, i) => {
        const rad = (i * 60 * Math.PI) / 180
        const x = cx + r * 0.72 * Math.cos(rad)
        const y = cy + r * 0.72 * Math.sin(rad)
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(r / 3.2).toFixed(2)}" fill="${color}"/>`
      }).join(''),
  }

/** Open Graph / README banner, 1200 × 630: mark, name, tagline and the agent chips. */
function bannerSvg(): string {
  const left = 392
  const parts = [
    text('Remote Harness', 'bold', 60, TEXT, left, 300),
    text('Follow and drive your coding agents from your phone.', 'regular', 25, MUTED, left, 354),
  ]

  // Chips: outline sized by the label, agent square with a drawn glyph instead of a letter code.
  const top = 404
  const height = 44
  const pad = 14
  const square = 24
  let x = left
  for (const item of [
    { label: 'Claude Code', agent: { glyph: AGENT_GLYPHS.claude, color: AGENTS.claude } },
    { label: 'Codex', agent: { glyph: AGENT_GLYPHS.codex, color: AGENTS.codex } },
    { label: '+ soon', agent: null },
  ]) {
    const lead = item.agent ? square + 10 : 0
    const width = Math.round(pad + lead + textWidth(item.label, 'regular', 23) + pad)
    const dash = item.agent ? '' : ' stroke-dasharray="6 5"'
    parts.push(
      `<rect x="${x}" y="${top}" width="${width}" height="${height}" rx="${height / 2}" fill="none" stroke="${BORDER_STRONG}" stroke-width="2"${dash}/>`,
    )
    if (item.agent) {
      const sx = x + pad
      const sy = top + (height - square) / 2
      parts.push(
        `<rect x="${sx}" y="${sy}" width="${square}" height="${square}" rx="6" fill="${item.agent.color}"/>`,
      )
      parts.push(item.agent.glyph(INK, sx + square / 2, sy + square / 2, square / 2 - 4))
    }
    parts.push(text(item.label, 'regular', 23, TEXT, x + pad + lead, top + 30))
    x += width + 14
  }

  const { defs, rects } = backdrop('og')
  return svg(
    1200,
    630,
    `<defs>${defs}</defs>${rects}${markAt('regular', ACCENT, 96, 183, 264)}${parts.join('')}`,
  )
}

/** Google Play feature graphic, 1024 × 500: the banner's composition without the chips. */
function featureGraphicSvg(): string {
  const left = 352
  const parts = [
    text('Remote Harness', 'bold', 54, TEXT, left, 232),
    text('Follow and drive your coding agents', 'regular', 21, MUTED, left, 280),
    text('from your phone.', 'regular', 21, MUTED, left, 312),
  ]
  const { defs, rects } = backdrop('fg')
  return svg(
    1024,
    500,
    `<defs>${defs}</defs>${rects}${markAt('regular', ACCENT, 84, 128, 244)}${parts.join('')}`,
  )
}

// --- Output -------------------------------------------------------------------------------------

async function render(source: string, file: string, size?: number, background?: string) {
  mkdirSync(dirname(file), { recursive: true })
  let image = sharp(Buffer.from(source))
  if (size) image = image.resize(size, size)
  if (background) image = image.flatten({ background })
  await image.png().toFile(file)
  console.log(`✓ ${file}`)
}

function write(file: string, source: string) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${source}\n`)
  console.log(`✓ ${file}`)
}

write(join(assets, 'icon', 'mark.svg'), markSvg('regular'))
write(join(assets, 'icon', 'mark-bold.svg'), markSvg('bold'))
write(join(assets, 'icon', 'icon.svg'), iconSvg())
write(join(assets, 'icon', 'splash.svg'), splashSvg())
write(join(linuxTray, 'remote-harness-symbolic.svg'), symbolicSvg())
await render(iconSvg(), join(assets, 'icon.png'), 1024, BG)
await render(splashSvg(), join(assets, 'splash-icon.png'), 1024)
await render(iconSvg('bold'), join(assets, 'favicon.png'), 48, BG)
// Live Activity header (48 pt @3x); small, since ActivityKit refuses large images.
await render(iconSvg('bold'), join(assets, 'live-activity-icon.png'), 144, BG)
await render(adaptiveForegroundSvg(), join(assets, 'adaptive-icon.png'), 1024)
await render(monochromeSvg((1024 * 24) / 108), join(assets, 'adaptive-icon-monochrome.png'), 1024)
await render(monochromeSvg(82), join(assets, 'notification-icon.png'), 96)
await render(bannerSvg(), join(brand, 'og.png'))
write(join(store, 'feature-graphic.svg'), featureGraphicSvg())
await render(featureGraphicSvg(), join(store, 'feature-graphic.png'))

// Alternate app icons, one per theme (#233); app.config.ts's expo-alternate-app-icons plugin wires
// them up, src/features/settings/app-icon-store.ts picks one by name at runtime.
for (const [theme, { bg, accent }] of Object.entries(ICON_THEMES)) {
  await render(themedIconSvg(bg, accent), join(assets, 'app-icon', `${theme}.png`), 1024, bg)
  await render(adaptiveForegroundSvg(accent), join(assets, 'app-icon', `${theme}-foreground.png`), 1024)
}
