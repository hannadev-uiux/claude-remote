/**
 * Side effects shared by the web install link publishers (ios-link.mts --web, android-link.mts):
 * the folder's token, the site server check, uploads over SSH and the `builds.json` update.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUILDS_FILE,
  type LinkBuilds,
  mergeBuilds,
  WEB_TOKEN,
  type WebHost,
  webHost,
  webPath,
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

/** The site server from the environment, reachable over SSH without a prompt; exits otherwise. */
export function checkWebHost(): WebHost {
  const target = webHost(process.env)
  if ('error' in target) {
    console.error(`✗ set ${target.error} (the remoteharness.app server: user@host, and its folder)`)
    process.exit(1)
  }
  try {
    execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', target.host, 'true'], {
      stdio: 'ignore',
    })
  } catch {
    console.error(`✗ cannot reach ${target.host} over SSH (key loaded? host in known_hosts?)`)
    process.exit(1)
  }
  return target
}

/**
 * Copies `<dir>/<name>` to `<token>/<name>` on the server under a temporary name and renames it,
 * so the site never serves half a file.
 */
export function webPut(target: WebHost, dir: string, token: string, name: string): void {
  console.log(`▸ upload ${name}`)
  const remote = webPath(target, token, name)
  const quiet = { stdio: ['ignore', 'ignore', 'inherit'] } as const
  execFileSync('ssh', [target.host, `mkdir -p '${remote.slice(0, remote.lastIndexOf('/'))}'`], quiet)
  execFileSync('scp', ['-q', join(dir, name), `${target.host}:${remote}.part`], quiet)
  execFileSync('ssh', [target.host, `mv -f '${remote}.part' '${remote}'`], quiet)
}

/**
 * Merges this platform's entry into `<dir>/builds.json` and uploads it. Called after the build files
 * are up, so the page never offers a file that is not there yet.
 */
export function publishBuilds(target: WebHost, dir: string, token: string, update: LinkBuilds): void {
  const file = join(dir, BUILDS_FILE)
  let current: unknown = null
  try {
    current = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    // First publish from this folder, or a broken copy: start over with this platform.
  }
  writeFileSync(file, `${JSON.stringify(mergeBuilds(current, update), null, 2)}\n`)
  webPut(target, dir, token, BUILDS_FILE)
}
