/**
 * Writes the store listing texts (store/metadata.ts) in fastlane's layout, so `fastlane deliver`
 * (App Store) and `fastlane supply` (Google Play) upload them as they are, or they can be pasted
 * into the consoles. Output: store/fastlane/metadata/{ios,android}/<locale>/*.txt (ignored by git).
 * Run: pnpm --filter @remote-harness/mobile store:metadata
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STORE_METADATA } from '../store/metadata.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', 'store', 'fastlane', 'metadata')

function write(dir: string, name: string, value: string): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), `${value}\n`)
}

for (const [locale, listing] of Object.entries(STORE_METADATA)) {
  const ios = join(root, 'ios', locale)
  write(ios, 'name.txt', listing.name)
  write(ios, 'subtitle.txt', listing.subtitle)
  write(ios, 'description.txt', listing.description)
  write(ios, 'keywords.txt', listing.keywords.join(','))
  write(ios, 'promotional_text.txt', listing.promotionalText)
  write(ios, 'release_notes.txt', listing.releaseNotes)
  write(ios, 'support_url.txt', listing.supportUrl)
  write(ios, 'marketing_url.txt', listing.marketingUrl)
  write(ios, 'privacy_url.txt', listing.privacyUrl)

  const android = join(root, 'android', locale)
  write(android, 'title.txt', listing.name)
  write(android, 'short_description.txt', listing.shortDescription)
  write(android, 'full_description.txt', listing.description)
  write(join(android, 'changelogs'), 'default.txt', listing.releaseNotes)
  console.log(`✓ ${locale}`)
}
console.log(`→ ${root}`)
