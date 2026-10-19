/**
 * Side effects shared by the web install link publishers (ios-link.mts --web, android-link.mts):
 * the folder's token, the Cloudflare login check, R2 uploads and the `builds.json` update.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUILDS_FILE,
  type LinkBuilds,
  mergeBuilds,
  WEB_BUCKET,
  WEB_TOKEN,
  WEB_TYPES,
} from './app-link-files.ts'

/** Token of the web link for this folder, created on first use and shared by both platforms. */
export function webToken(dir: string): string {
  const file = join(dir, '.web-token')
  const saved = existsSync(file) ? readFileSync(file, 'utf8').trim() : ''
  if (WEB_TOKEN.test(saved)) return saved
  const token = randomBytes(24).toString('base64url')
  writeFileSync(file, `${token}\n`, { mode: 0o600 })
  return token
}

export function checkCloudflare(): void {
  try {
    execFileSync('cf', ['auth', 'whoami'], { stdio: 'ignore' })
  } catch {
    console.error('✗ the Cloudflare CLI is not logged in: install `cf` and run `cf auth login`.')
    process.exit(1)
  }
}

/** Uploads `<dir>/<name>` to `<token>/<name>` in the bucket. */
export function r2Put(dir: string, token: string, name: string): void {
  console.log(`▸ upload ${name}`)
  execFileSync(
    'cf',
    [
      'r2',
      'objects',
      'put',
      `${token}/${name}`,
      '--bucket-name',
      WEB_BUCKET,
      '--file',
      join(dir, name),
      '--content-type',
      WEB_TYPES[name] ?? 'application/octet-stream',
      '--quiet',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
}

/**
 * Merges this platform's entry into `<dir>/builds.json` and uploads it. Called after the build files
 * are up, so the page never offers a file that is not there yet.
 */
export function publishBuilds(dir: string, token: string, update: LinkBuilds): void {
  const file = join(dir, BUILDS_FILE)
  let current: unknown = null
  try {
    current = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    // First publish from this folder, or a broken copy: start over with this platform.
  }
  writeFileSync(file, `${JSON.stringify(mergeBuilds(current, update), null, 2)}\n`)
  r2Put(dir, token, BUILDS_FILE)
}
