/**
 * Installs a release build on the iPhone from a Safari link over Tailscale, from any network and
 * without a cable (Make: `install-ios-link`). With `--web` (Make: `IOS_LINK=web`) the files go to
 * R2 behind https://remoteharness.app/ios/<token>/ instead, so the phone needs no Tailscale; the
 * random token is kept in `<dir>/.web-token` and reused by later builds.
 * - `tsx scripts/ios-link.mts --check` prints the install page URL, or why Tailscale cannot serve it.
 * - `tsx scripts/ios-link.mts <archive> <dir>` exports the archive to an IPA in <dir>, writes the
 *   manifest and the install page next to it and publishes them on the tailnet only.
 * - `tsx scripts/ios-link.mts --serve <dir>` is the server that does it, started in the background.
 * Tailscale cannot serve a folder on macOS (sandbox), so it proxies to that server, which listens on
 * 127.0.0.1 only and hands out just those three files. It keeps running and rereads them per
 * request, so later builds reuse it; after a reboot the next `make install-ios-link` restarts it.
 * The IPA is development-signed, so only devices registered in the Apple team can install it.
 */
import { execFileSync, spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type AppInfo,
  buildManifest,
  buildPage,
  HINTS,
  SERVED,
  servedFile,
  tailnetHost,
  WEB_BASE,
  WEB_BUCKET,
  WEB_TOKEN,
} from './ios-link-files.ts'

/** Path under the Mac's tailnet name, so other `tailscale serve` routes are left alone. */
const SERVE_PATH = '/remote-harness'
const IPA = 'RemoteHarness.ipa'
const PORT = 47391
const LOCAL = `http://127.0.0.1:${PORT}`
/** Answers with a hash of the served folder (not its path, since Tailscale proxies every path). */
const HEALTH = '/.ios-link'
const folderId = (dir: string) => createHash('sha256').update(dir).digest('hex').slice(0, 16)

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()

function baseUrl(): string {
  let json: unknown
  try {
    json = JSON.parse(run('tailscale', ['status', '--json']))
  } catch {
    console.error('✗ `tailscale status` failed: install Tailscale and add the `tailscale` CLI to the PATH.')
    process.exit(1)
  }
  const tailnet = tailnetHost(json)
  if (!tailnet.ok) {
    console.error(`✗ ${HINTS[tailnet.reason]}`)
    process.exit(1)
  }
  return `https://${tailnet.host}${SERVE_PATH}`
}

function plistValue(file: string, key: string): string | undefined {
  try {
    return run('plutil', ['-extract', key, 'raw', '-o', '-', file]) || undefined
  } catch {
    return undefined
  }
}

function appInfo(archive: string): AppInfo {
  const props = join(archive, 'Info.plist')
  const app = join(archive, 'Products', plistValue(props, 'ApplicationProperties.ApplicationPath') ?? '')
  const bundleId = plistValue(props, 'ApplicationProperties.CFBundleIdentifier')
  if (!bundleId) {
    console.error(`✗ not an app archive: ${archive}`)
    process.exit(1)
  }
  const appPlist = join(app, 'Info.plist')
  return {
    bundleId,
    version: plistValue(props, 'ApplicationProperties.CFBundleShortVersionString') ?? '0',
    build: plistValue(props, 'ApplicationProperties.CFBundleVersion') ?? '0',
    title: plistValue(appPlist, 'CFBundleDisplayName') ?? plistValue(appPlist, 'CFBundleName') ?? bundleId,
  }
}

/** `debugging` is Xcode's current name for a development export (installable on registered devices). */
function exportIpa(archive: string, dir: string): void {
  const work = mkdtempSync(join(tmpdir(), 'ios-link-'))
  try {
    const options = join(work, 'ExportOptions.plist')
    writeFileSync(
      options,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>debugging</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>thinning</key>
  <string>&lt;none&gt;</string>
</dict>
</plist>
`,
    )
    const out = join(work, 'out')
    console.log('▸ xcodebuild -exportArchive')
    execFileSync(
      'xcodebuild',
      [
        '-quiet',
        '-exportArchive',
        '-archivePath',
        archive,
        '-exportPath',
        out,
        '-exportOptionsPlist',
        options,
        '-allowProvisioningUpdates',
      ],
      { stdio: 'inherit' },
    )
    const ipa = readdirSync(out).find((name) => name.endsWith('.ipa'))
    if (!ipa) {
      console.error('✗ xcodebuild exported no .ipa')
      process.exit(1)
    }
    copyFileSync(join(out, ipa), join(dir, IPA))
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function serve(dir: string): void {
  createServer((req, res) => {
    if (req.url === HEALTH) {
      res.end(folderId(dir))
      return
    }
    const file = req.method === 'GET' || req.method === 'HEAD' ? servedFile(req.url ?? '/') : undefined
    const path = file && join(dir, file.name)
    let size: number
    try {
      size = path ? statSync(path).size : -1
    } catch {
      size = -1
    }
    if (!file || !path || size < 0) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': file.type, 'Content-Length': size, 'Cache-Control': 'no-cache' })
    if (req.method === 'HEAD') res.end()
    else createReadStream(path).pipe(res)
  }).listen(PORT, '127.0.0.1')
}

async function servingDir(): Promise<string | undefined> {
  try {
    const res = await fetch(`${LOCAL}${HEALTH}`, { signal: AbortSignal.timeout(1000) })
    return res.ok ? await res.text() : undefined
  } catch {
    return undefined
  }
}

/** Reuses the server of an earlier run, or starts one detached from this process. */
async function ensureServer(dir: string): Promise<void> {
  let current = await servingDir()
  if (current === undefined) {
    spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--serve', dir], {
      detached: true,
      stdio: 'ignore',
    }).unref()
    for (let i = 0; i < 50 && current === undefined; i++) {
      await new Promise((done) => setTimeout(done, 100))
      current = await servingDir()
    }
  }
  if (current !== folderId(dir)) {
    console.error(
      current === undefined
        ? `✗ the local server did not start on ${LOCAL} (port in use?)`
        : `✗ ${LOCAL} already serves another folder; stop that process (lsof -iTCP:${PORT}) or use the same IOS_LINK_DIR`,
    )
    process.exit(1)
  }
}

/** Token of the web link for this folder, created on first use. */
function webToken(dir: string): string {
  const file = join(dir, '.web-token')
  const saved = existsSync(file) ? readFileSync(file, 'utf8').trim() : ''
  if (WEB_TOKEN.test(saved)) return saved
  const token = randomBytes(24).toString('base64url')
  writeFileSync(file, `${token}\n`, { mode: 0o600 })
  return token
}

function checkCloudflare(): void {
  try {
    run('cf', ['auth', 'whoami'])
  } catch {
    console.error('✗ the Cloudflare CLI is not logged in: install `cf` and run `cf auth login`.')
    process.exit(1)
  }
}

/** Uploads the three files to R2, the IPA last-but-one and the page last, so the page never links to a missing build. */
function uploadWeb(dir: string, token: string): void {
  for (const name of ['RemoteHarness.ipa', 'manifest.plist', 'index.html']) {
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
        SERVED[name] ?? 'application/octet-stream',
        '--quiet',
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    )
  }
}

const args = process.argv.slice(2).filter((a) => a !== '--web')
const web = process.argv.includes('--web')
if (args.includes('--check')) {
  if (web) checkCloudflare()
  console.log(web ? `✓ ${WEB_BASE}/<token>/` : `✓ ${baseUrl()}/`)
  process.exit(0)
}
if (args[0] === '--serve' && args[1]) {
  serve(resolve(args[1]))
} else {
  const [archiveArg, dirArg] = args
  if (!archiveArg || !dirArg) {
    console.error('usage: tsx scripts/ios-link.mts [--web] --check | [--web] <archive.xcarchive> <dir>')
    process.exit(1)
  }
  const archive = resolve(archiveArg)
  const dir = resolve(dirArg)
  mkdirSync(dir, { recursive: true })
  const token = web ? webToken(dir) : ''
  const base = web ? `${WEB_BASE}/${token}` : baseUrl()
  const app = appInfo(archive)

  exportIpa(archive, dir)
  // The query defeats Safari's cache between builds; the files themselves keep fixed names.
  const stamp = Date.now()
  writeFileSync(join(dir, 'manifest.plist'), buildManifest(app, `${base}/${IPA}?v=${stamp}`))
  writeFileSync(join(dir, 'index.html'), buildPage(app, `${base}/manifest.plist?v=${stamp}`, new Date(stamp)))

  if (web) {
    uploadWeb(dir, token)
    console.log(`✓ ${app.title} ${app.version} (${app.build}) ready`)
    console.log(`  On a registered iPhone (any network), open in Safari and tap Install:\n  ${base}/`)
    process.exit(0)
  }
  await ensureServer(dir)
  try {
    execFileSync('tailscale', ['serve', '--bg', '--set-path', SERVE_PATH, LOCAL], { stdio: 'ignore' })
  } catch {
    console.error(
      `✗ \`tailscale serve\` failed; run it to see why: tailscale serve --bg --set-path ${SERVE_PATH} ${LOCAL}`,
    )
    process.exit(1)
  }
  console.log(`✓ ${app.title} ${app.version} (${app.build}) ready`)
  console.log(`  On the iPhone (any network, Tailscale on), open in Safari and tap Install:\n  ${base}/`)
}
