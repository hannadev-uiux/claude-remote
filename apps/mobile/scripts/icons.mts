/**
 * Generates the app icon and splash from code so the artwork stays reviewable and reproducible.
 * Foreground: the Claude spark in Claude orange. Background: a terminal window with a `>_` prompt.
 * Android also gets an adaptive icon (the artwork inside the 66% safe zone over a solid background),
 * a monochrome themed icon and the white status bar notification icon.
 * Run: pnpm --filter @remote-harness/mobile icons
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const ORANGE = '#D97757'
const BG = '#0D0D0D'

/** Claude-style spark: tapered rays of varying length around a center. */
function spark(cx: number, cy: number, radius: number): string {
  const rays = 12
  const parts: string[] = []
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + Math.PI / 24
    const length = radius * (i % 2 === 0 ? 1 : 0.84) * (i % 3 === 0 ? 0.94 : 1)
    const width = radius * 0.16
    const inner = radius * 0.16
    const tip = { x: cx + Math.cos(angle) * length, y: cy + Math.sin(angle) * length }
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    const b1 = { x: cx + Math.cos(angle) * inner + nx * width, y: cy + Math.sin(angle) * inner + ny * width }
    const b2 = { x: cx + Math.cos(angle) * inner - nx * width, y: cy + Math.sin(angle) * inner - ny * width }
    const tipW = width * 0.62
    const t1 = { x: tip.x + nx * tipW, y: tip.y + ny * tipW }
    const t2 = { x: tip.x - nx * tipW, y: tip.y - ny * tipW }
    parts.push(
      `<path d="M${b1.x.toFixed(1)} ${b1.y.toFixed(1)} L${t1.x.toFixed(1)} ${t1.y.toFixed(1)} Q${(tip.x + Math.cos(angle) * tipW).toFixed(1)} ${(tip.y + Math.sin(angle) * tipW).toFixed(1)} ${t2.x.toFixed(1)} ${t2.y.toFixed(1)} L${b2.x.toFixed(1)} ${b2.y.toFixed(1)} Z"/>`,
    )
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${(radius * 0.2).toFixed(1)}"/>`)
  return `<g fill="${ORANGE}">${parts.join('')}</g>`
}

function iconSvg(size = 1024): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B1A19"/>
      <stop offset="1" stop-color="${BG}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.64" cy="0.64" r="0.45">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- terminal window -->
  <rect x="112" y="152" width="800" height="720" rx="64" fill="#161616" stroke="#2E2C2A" stroke-width="10"/>
  <path d="M117 216 a59 59 0 0 1 59 -59 h672 a59 59 0 0 1 59 59 v40 h-790 z" fill="#1F1E1D"/>
  <circle cx="186" cy="206" r="18" fill="#3A3836"/>
  <circle cx="246" cy="206" r="18" fill="#3A3836"/>
  <circle cx="306" cy="206" r="18" fill="#3A3836"/>
  <!-- >_ prompt -->
  <path d="M206 356 L330 446 L206 536" fill="none" stroke="#5E5A56" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="372" y="510" width="150" height="40" rx="12" fill="#5E5A56"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  ${spark(652, 652, 210)}
</svg>`
}

/** The icon artwork without its background, shrunk into the adaptive icon safe zone (66%). */
function adaptiveForegroundSvg(): string {
  const scale = 0.66
  const offset = (1024 * (1 - scale)) / 2
  const art = iconSvg()
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace('<rect width="1024" height="1024" fill="url(#bg)"/>', '')
    .replace('<rect width="1024" height="1024" fill="url(#glow)"/>', '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(${offset} ${offset}) scale(${scale})">${art}</g>
</svg>`
}

/** White spark on transparent: Android themed (monochrome) icon and status bar notification icon. */
function monochromeSvg(radius: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${spark(512, 512, radius).replace(`fill="${ORANGE}"`, 'fill="#FFFFFF"')}
</svg>`
}

function splashSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <path d="M300 380 L440 512 L300 644" fill="none" stroke="#3A3836" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="480" y="610" width="150" height="44" rx="12" fill="#3A3836"/>
  ${spark(700, 470, 150)}
</svg>`
}

async function render(svg: string, file: string, size: number, background?: string) {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  let image = sharp(Buffer.from(svg)).resize(size, size)
  if (background) image = image.flatten({ background })
  await image.png().toFile(path)
  console.log(`✓ ${file}`)
}

writeFileSync(join(root, 'icon', 'icon.svg'), iconSvg())
writeFileSync(join(root, 'icon', 'splash.svg'), splashSvg())
await render(iconSvg(), 'icon.png', 1024, BG)
await render(splashSvg(), 'splash-icon.png', 1024)
await render(iconSvg(), 'favicon.png', 48, BG)
await render(adaptiveForegroundSvg(), 'adaptive-icon.png', 1024)
await render(monochromeSvg(300), 'adaptive-icon-monochrome.png', 1024)
await render(monochromeSvg(440), 'notification-icon.png', 96)
