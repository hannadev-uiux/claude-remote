import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Executor } from '../infra/exec.ts'
import { writeFileAtomic } from '../infra/fs.ts'
import type { Platform } from '../infra/platform.ts'
import { paths } from './paths.ts'

export interface TokenStore {
  get(): Promise<string | null>
  set(token: string): Promise<void>
}

/** A secret store that can also forget its secret (provider keys of removed profiles). */
export interface SecretStore extends TokenStore {
  /** Removes the secret; a secret that is not stored is not an error. */
  delete(): Promise<void>
}

/** Keychain service / Secret Service attribute shared by every secret of ours (the launchers read it too). */
export const SECRET_SERVICE = 'claude-remote'
const SERVICE = SECRET_SERVICE
const ACCOUNT = 'pairing-token'

/** Stores a secret (the pairing token by default) in the macOS login Keychain via the `security` CLI. */
export class KeychainTokenStore implements SecretStore {
  constructor(
    private readonly exec: Executor,
    private readonly account = ACCOUNT,
  ) {}

  async get(): Promise<string | null> {
    const result = await this.exec('security', [
      'find-generic-password',
      '-s',
      SERVICE,
      '-a',
      this.account,
      '-w',
    ])
    if (result.exitCode !== 0) return null
    const token = result.stdout.trim()
    return token.length > 0 ? token : null
  }

  /**
   * `security -i` reads the command from stdin, so the token never shows up in `ps`. Its exit code
   * ignores failed commands, so the write is confirmed by reading the token back.
   */
  async set(token: string): Promise<void> {
    if (!/^[\w-]+$/.test(token)) throw new Error('keychain write failed: unexpected token format')
    const command = `add-generic-password -U -s ${SERVICE} -a ${this.account} -w "${token}"\n`
    const result = await this.exec('security', ['-i'], { input: command })
    if (result.exitCode !== 0 || (await this.get()) !== token)
      throw new Error(`keychain write failed: ${result.stderr.trim()}`)
  }

  /** Exit 44 is "the specified item could not be found". */
  async delete(): Promise<void> {
    const result = await this.exec('security', ['delete-generic-password', '-s', SERVICE, '-a', this.account])
    if (result.exitCode !== 0 && result.exitCode !== 44)
      throw new Error(`keychain delete failed: ${result.stderr.trim()}`)
  }
}

/**
 * Linux: Secret Service (GNOME Keyring, KWallet…) through `secret-tool` (libsecret). The token goes
 * on stdin, never in the arguments, so it does not show up in `ps`.
 */
export class SecretToolTokenStore implements SecretStore {
  constructor(
    private readonly exec: Executor,
    private readonly account = ACCOUNT,
    private readonly label = 'Remote Harness pairing token',
  ) {}

  async get(): Promise<string | null> {
    const result = await this.exec('secret-tool', ['lookup', 'service', SERVICE, 'account', this.account])
    if (result.exitCode === 0) return result.stdout.trim() || null
    // Not found is a silent exit 1; anything on stderr means the Secret Service itself failed, and
    // answering null would make the caller generate (and lose) a new token.
    if (result.stderr.trim()) throw new Error(`secret-tool lookup failed: ${result.stderr.trim()}`)
    return null
  }

  async set(token: string): Promise<void> {
    const result = await this.exec(
      'secret-tool',
      ['store', `--label=${this.label}`, 'service', SERVICE, 'account', this.account],
      { input: token },
    )
    if (result.exitCode !== 0) throw new Error(`secret-tool store failed: ${result.stderr.trim()}`)
  }

  async delete(): Promise<void> {
    const result = await this.exec('secret-tool', ['clear', 'service', SERVICE, 'account', this.account])
    if (result.exitCode !== 0 && result.stderr.trim())
      throw new Error(`secret-tool clear failed: ${result.stderr.trim()}`)
  }
}

/** File-based store (0600): headless Linux without a Secret Service, tests and development. */
export class FileTokenStore implements SecretStore {
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
    // Secrets of ours share a 0700 folder (`secrets/`); the data dir itself keeps its mode.
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    await writeFileAtomic(this.path, token, 0o600)
  }

  async delete(): Promise<void> {
    await rm(this.path, { force: true })
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
  /** `REMOTE_HARNESS_TOKEN_STORE`: forces a store (`keychain`, `secret-tool` or `file`). */
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

/** Account of a profile's provider key in the secret store (and its file name in the file store). */
export function providerKeyAccount(profileId: string): string {
  return `provider-${profileId}`
}

/** A store for another secret of ours, in the same backend as the pairing token. */
export function createSecretStore(
  kind: TokenStoreKind,
  exec: Executor,
  account: string,
  file: string,
  label?: string,
): SecretStore {
  if (kind === 'keychain') return new KeychainTokenStore(exec, account)
  if (kind === 'secret-tool') return new SecretToolTokenStore(exec, account, label)
  return new FileTokenStore(file)
}

/** The provider key of a profile: read by the daemon for credits, written by `remote-harness provider key` and the setup. */
export function providerKeyStore(kind: TokenStoreKind, exec: Executor, profileId: string): SecretStore {
  return createSecretStore(
    kind,
    exec,
    providerKeyAccount(profileId),
    paths.providerKey(profileId),
    `Remote Harness provider key (${profileId})`,
  )
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
