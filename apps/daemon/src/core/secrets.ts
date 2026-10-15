import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Executor } from '../infra/exec.ts'
import { writeFileAtomic } from '../infra/fs.ts'
import type { Platform } from '../infra/platform.ts'
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

/**
 * Linux: Secret Service (GNOME Keyring, KWallet…) through `secret-tool` (libsecret). The token goes
 * on stdin, never in the arguments, so it does not show up in `ps`.
 */
export class SecretToolTokenStore implements TokenStore {
  constructor(private readonly exec: Executor) {}

  async get(): Promise<string | null> {
    const result = await this.exec('secret-tool', ['lookup', 'service', SERVICE, 'account', ACCOUNT])
    if (result.exitCode === 0) return result.stdout.trim() || null
    // Not found is a silent exit 1; anything on stderr means the Secret Service itself failed, and
    // answering null would make the caller generate (and lose) a new token.
    if (result.stderr.trim()) throw new Error(`secret-tool lookup failed: ${result.stderr.trim()}`)
    return null
  }

  async set(token: string): Promise<void> {
    const result = await this.exec(
      'secret-tool',
      ['store', '--label=Claude Remote pairing token', 'service', SERVICE, 'account', ACCOUNT],
      { input: token },
    )
    if (result.exitCode !== 0) throw new Error(`secret-tool store failed: ${result.stderr.trim()}`)
  }
}

/** File-based store (0600): headless Linux without a Secret Service, tests and development. */
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

export const TOKEN_STORE_KINDS = ['keychain', 'secret-tool', 'file'] as const
export type TokenStoreKind = (typeof TOKEN_STORE_KINDS)[number]

function isTokenStoreKind(value: string | undefined): value is TokenStoreKind {
  return (TOKEN_STORE_KINDS as readonly (string | undefined)[]).includes(value)
}

export type SelectedTokenStore = { kind: TokenStoreKind; store: TokenStore }

export type TokenStoreSelection = {
  platform: Platform
  exec: Executor
  /** `CLAUDE_REMOTE_TOKEN_STORE`: forces a store (`keychain`, `secret-tool` or `file`). */
  forced?: string
  tokenFile?: string
  /** Remembers the store picked on Linux, so a later run (e.g. the service at boot) uses the same one. */
  choiceFile?: string
}

export function createTokenStore(
  kind: TokenStoreKind,
  exec: Executor,
  tokenFile = paths.tokenFile(),
): TokenStore {
  if (kind === 'keychain') return new KeychainTokenStore(exec)
  if (kind === 'secret-tool') return new SecretToolTokenStore(exec)
  return new FileTokenStore(tokenFile)
}

async function readChoice(path: string): Promise<TokenStoreKind | null> {
  try {
    const kind = (await readFile(path, 'utf8')).trim()
    return isTokenStoreKind(kind) ? kind : null
  } catch {
    return null
  }
}

/**
 * Linux without a recorded choice: the Secret Service when `secret-tool` is installed and answers
 * (and the token is not already in the file), otherwise the `0600` file.
 */
async function probeLinux(exec: Executor, tokenFile: string): Promise<TokenStoreKind> {
  if ((await exec('which', ['secret-tool'])).exitCode !== 0) return 'file'
  const lookup = await exec('secret-tool', ['lookup', 'service', SERVICE, 'account', ACCOUNT])
  if (lookup.exitCode === 0 && lookup.stdout.trim()) return 'secret-tool'
  if (await new FileTokenStore(tokenFile).get()) return 'file'
  return lookup.exitCode === 0 || !lookup.stderr.trim() ? 'secret-tool' : 'file'
}

/** macOS: Keychain. Linux: the recorded choice, else probes `secret-tool` and records the result. */
export async function selectTokenStore(o: TokenStoreSelection): Promise<SelectedTokenStore> {
  const tokenFile = o.tokenFile ?? paths.tokenFile()
  const choiceFile = o.choiceFile ?? paths.tokenStoreChoice()
  let kind: TokenStoreKind
  if (isTokenStoreKind(o.forced)) kind = o.forced
  else if (o.platform === 'darwin') kind = 'keychain'
  else {
    const recorded = await readChoice(choiceFile)
    kind = recorded ?? (await probeLinux(o.exec, tokenFile))
    if (!recorded) await writeFileAtomic(choiceFile, `${kind}\n`, 0o600)
  }
  return { kind, store: createTokenStore(kind, o.exec, tokenFile) }
}
