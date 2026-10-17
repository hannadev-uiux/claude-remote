/**
 * Installs a release build on the iPhone from a Safari link over Tailscale, from any network and
 * without a cable (Make: `install-ios-link`).
 * - `tsx scripts/ios-link.mts --check` prints the install page URL, or why Tailscale cannot serve it.
 * - `tsx scripts/ios-link.mts <archive> <dir>` exports the archive to an IPA in <dir>, writes the
 *   manifest and the install page next to it and serves <dir> on the tailnet only (`tailscale serve`).
 * The IPA is development-signed, so only devices registered in the Apple team can install it.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { type AppInfo, buildManifest, buildPage, HINTS, tailnetHost } from './ios-link-files.ts'

/** Path under the Mac's tailnet name, so other `tailscale serve` routes are left alone. */
const SERVE_PATH = '/claude-remote'
const IPA = 'ClaudeRemote.ipa'

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

const args = process.argv.slice(2)
if (args.includes('--check')) {
  console.log(`✓ ${baseUrl()}/`)
  process.exit(0)
}

const [archiveArg, dirArg] = args
if (!archiveArg || !dirArg) {
  console.error('usage: tsx scripts/ios-link.mts --check | <archive.xcarchive> <dir>')
  process.exit(1)
}
const archive = resolve(archiveArg)
const dir = resolve(dirArg)
const base = baseUrl()
const app = appInfo(archive)

mkdirSync(dir, { recursive: true })
exportIpa(archive, dir)
// The query defeats Safari's cache between builds; the files themselves keep fixed names.
const stamp = Date.now()
writeFileSync(join(dir, 'manifest.plist'), buildManifest(app, `${base}/${IPA}?v=${stamp}`))
writeFileSync(join(dir, 'index.html'), buildPage(app, `${base}/manifest.plist?v=${stamp}`, new Date(stamp)))

try {
  execFileSync('tailscale', ['serve', '--bg', '--set-path', SERVE_PATH, dir], { stdio: 'ignore' })
} catch {
  console.error(
    `✗ \`tailscale serve\` failed; run it to see why: tailscale serve --bg --set-path ${SERVE_PATH} ${dir}`,
  )
  process.exit(1)
}
console.log(`✓ ${app.title} ${app.version} (${app.build}) ready`)
console.log(`  On the iPhone (any network, Tailscale on), open in Safari and tap Install:\n  ${base}/`)
