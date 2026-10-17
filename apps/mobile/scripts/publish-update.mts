/**
 * Publishes an over-the-air update of the app to a self-hosted Expo Updates server (maarkn.dev):
 * `expo export`, one manifest per platform signed locally, content-addressed asset upload.
 *
 *   REMOTE_HARNESS_UPDATES_URL=https://maarkn.dev/api/claude-remote/updates/manifest \
 *   REMOTE_HARNESS_UPDATES_TOKEN=… REMOTE_HARNESS_UPDATES_KEY=~/keys/private-key.pem \
 *   pnpm --filter @remote-harness/mobile ota:publish [--channel production|development]
 *     [--platform ios|android] [--dry-run]
 *
 * The URL must be the one the installed builds were made with (it is part of their runtime
 * version). The private key never leaves this machine; the server only stores the signature.
 * Each REMOTE_HARNESS_UPDATES_* variable falls back to its CLAUDE_REMOTE_UPDATES_* name.
 */

import { execFileSync } from 'node:child_process'
import { createPrivateKey, randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { buildManifest, type ExportMetadata, signatureHeader } from './update-manifest.ts'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
// Same env files Expo reads for the build (existing variables win; `.env.local` over `.env`).
for (const file of ['.env.local', '.env']) {
  if (existsSync(join(app, file))) process.loadEnvFile(join(app, file))
}
const { values } = parseArgs({
  options: {
    platform: { type: 'string', multiple: true },
    channel: { type: 'string', default: 'production' },
    'dry-run': { type: 'boolean', default: false },
  },
})
const platforms = (values.platform ?? ['ios', 'android']) as Array<'ios' | 'android'>
const channel = values.channel ?? 'production'

/** `REMOTE_HARNESS_<name>`, else the `CLAUDE_REMOTE_<name>` used before the rename. */
function env(name: string): string | undefined {
  return process.env[`REMOTE_HARNESS_${name}`] || process.env[`CLAUDE_REMOTE_${name}`] || undefined
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const updatesUrl = env('UPDATES_URL')
if (!/^[a-z][a-z0-9-]{0,31}$/.test(channel)) fail(`invalid channel: ${channel}`)
if (!updatesUrl) fail('REMOTE_HARNESS_UPDATES_URL is not set (the URL the builds were made with)')
const server = new URL(updatesUrl).origin
const keyPath = (env('UPDATES_KEY') ?? '').replace(/^~(?=\/)/, homedir())
if (!keyPath || !existsSync(keyPath)) fail('REMOTE_HARNESS_UPDATES_KEY must point to the private key (PEM)')
const token = env('UPDATES_TOKEN')
if (!token && !values['dry-run']) fail('REMOTE_HARNESS_UPDATES_TOKEN is not set')
const privateKey = createPrivateKey(readFileSync(keyPath))

function run(args: string[]): string {
  return execFileSync('npx', args, { cwd: app, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

async function upload(file: { hash: string; data: Uint8Array; contentType: string }): Promise<boolean> {
  const url = `${server}/api/claude-remote/updates/assets/${file.hash}`
  if ((await fetch(url, { method: 'HEAD' })).ok) return false
  const res = await fetch(url, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': file.contentType },
    body: file.data,
  })
  if (!res.ok) fail(`upload ${file.hash}: ${res.status} ${await res.text()}`)
  return true
}

const out = mkdtempSync(join(tmpdir(), 'claude-remote-update-'))
try {
  console.log('▸ expo export')
  run(['expo', 'export', ...platforms.flatMap((p) => ['--platform', p]), '--output-dir', out])
  const metadata = JSON.parse(readFileSync(join(out, 'metadata.json'), 'utf8')) as ExportMetadata
  const expoClient: unknown = JSON.parse(run(['expo', 'config', '--type', 'public', '--json']))

  for (const platform of platforms) {
    const files = metadata.fileMetadata[platform]
    if (!files) fail(`expo export produced nothing for ${platform}`)
    const { runtimeVersion } = JSON.parse(
      run(['expo-updates', 'runtimeversion:resolve', '--platform', platform]),
    ) as { runtimeVersion: string }
    const { manifest, files: uploads } = buildManifest({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      runtimeVersion,
      channel,
      server,
      bundle: { data: readFileSync(join(out, files.bundle)) },
      assets: files.assets.map((a) => ({ data: readFileSync(join(out, a.path)), ext: a.ext })),
      expoClient,
    })
    const signature = signatureHeader(manifest, privateKey)
    console.log(`▸ ${platform} → ${channel}: runtime ${runtimeVersion.slice(0, 12)}, ${uploads.length} files`)
    if (values['dry-run']) continue

    let sent = 0
    for (const file of uploads) if (await upload(file)) sent++
    const res = await fetch(`${server}/api/claude-remote/updates/manifests`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ platform, channel, runtimeVersion, manifest, signature }),
    })
    if (!res.ok) fail(`manifest ${platform}: ${res.status} ${await res.text()}`)
    const { id } = (await res.json()) as { id: string }
    console.log(`✓ ${platform}: update ${id} (${sent} new files)`)
  }
} finally {
  rmSync(out, { recursive: true, force: true })
}
