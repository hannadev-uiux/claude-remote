/**
 * Shrinks simulator screenshots for the README: half size (points, not pixels) as palette PNGs.
 *
 *   pnpm --filter @remote-harness/mobile screenshots <folder with sessions.png, conversation.png…>
 *
 * Writes `docs/screenshots/<name>.png` for every PNG in the folder. Take them from the demo
 * (`pnpm --filter @remote-harness/daemon demo`), as CONTRIBUTING.md explains.
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', '..', '..', 'docs', 'screenshots')
const input = process.argv[2]
if (!input) {
  console.error('Usage: screenshots <folder with the simulator screenshots>')
  process.exit(1)
}

for (const file of readdirSync(input).filter((f) => f.endsWith('.png'))) {
  const image = sharp(join(input, file))
  const { width } = await image.metadata()
  const target = join(out, file)
  const info = await image
    .resize({ width: Math.round((width ?? 1320) / 2) })
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toFile(target)
  console.log(`${target} ${info.width}×${info.height} ${Math.round(info.size / 1024)} KB`)
}
