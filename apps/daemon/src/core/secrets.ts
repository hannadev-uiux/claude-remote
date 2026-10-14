import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Executor } from '../infra/exec.ts'
import { writeFileAtomic } from '../infra/fs.ts'
import { paths } from './paths.ts'

export interface TokenStore {
  get(): Promise<string | null>
  set(token: string): Promise<void>
}

const SERVICE = 'claude-remote'
const ACCOUNT = 'pairing-token'

/** Stores the pairing token in the macOS login Keychain via the `security` CLI. */
export class KeychainTokenStore implements TokenStore {
  constructor(private readonly exec: Executor) {}

  async get(): Promise<string | null> {
    const result = await this.exec('security', ['find-generic-password', '-s', SERVICE, '-a', ACCOUNT, '-w'])
    if (result.exitCode !== 0) return null
    const token = result.stdout.trim()
    return token.length > 0 ? token : null
  }

  async set(token: string): Promise<void> {
    const result = await this.exec('security', [
      'add-generic-password',
      '-U',
      '-s',
      SERVICE,
      '-a',
      ACCOUNT,
      '-w',
      token,
    ])
    if (result.exitCode !== 0) throw new Error(`keychain write failed: ${result.stderr.trim()}`)
  }
}

/** File-based store (0600) for tests and non-macOS development. */
export class FileTokenStore implements TokenStore {
  constructor(private readonly path = paths.tokenFile()) {}

  async get(): Promise<string | null> {
    try {
      const token = (await readFile(this.path, 'utf8')).trim()
      return token || null
    } catch {
      return null
    }
  }

  async set(token: string): Promise<void> {
    await writeFileAtomic(this.path, token, 0o600)
  }
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function ensureToken(store: TokenStore): Promise<string> {
  const existing = await store.get()
  if (existing) return existing
  const token = generateToken()
  await store.set(token)
  return token
}

/** Shared secret the hooks send in `X-Claude-Remote-Secret`; lives in a 0600 file. */
export async function ensureHookSecret(path = paths.hookSecret()): Promise<string> {
  try {
    const secret = (await readFile(path, 'utf8')).trim()
    if (secret) return secret
  } catch {
    // created below
  }
  const secret = randomBytes(24).toString('base64url')
  await writeFileAtomic(path, secret, 0o600)
  return secret
}
