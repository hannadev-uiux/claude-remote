/**
 * The single install URL (`/install`): who is asking, which system a browser runs on, the `?ref=`
 * option and the scripts with that ref as their default. Pure; the Worker only wires it up.
 */

/** The one-liners every page, guide and message shows (the README too). */
export const INSTALL_URL = 'https://remoteharness.app/install'
export const INSTALL_COMMANDS = {
  unix: `curl -fsSL ${INSTALL_URL} | bash`,
  windows: `irm ${INSTALL_URL} | iex`,
} as const

/** The one-liners for another version (`?ref=`); quoted, since `?` is a glob character in shells. */
export function installCommands(ref: string | null): { unix: string; windows: string } {
  if (ref === null) return INSTALL_COMMANDS
  const url = `${INSTALL_URL}?ref=${ref}`
  return { unix: `curl -fsSL "${url}" | bash`, windows: `irm "${url}" | iex` }
}

export type InstallClient = 'shell' | 'powershell' | 'browser'
export type InstallScriptName = 'install.sh' | 'install.ps1'

/**
 * `powershell` for Windows PowerShell 5.1 (`WindowsPowerShell/5.1…`) and PowerShell 7
 * (`PowerShell/7.x`), checked first since both start with `Mozilla/5.0`; `browser` for a browser
 * user agent or a request that asks for HTML; `shell` for the rest (curl, Wget, no user agent),
 * so a pipe to bash never receives a page.
 */
export function classifyInstallClient(userAgent: string | null, accept: string | null = null): InstallClient {
  const ua = userAgent ?? ''
  if (/PowerShell/i.test(ua)) return 'powershell'
  if (/^(Mozilla|Opera)\//.test(ua) || /^text\/html\b/i.test(accept ?? '')) return 'browser'
  return 'shell'
}

export function scriptFor(client: Exclude<InstallClient, 'browser'>): InstallScriptName {
  return client === 'powershell' ? 'install.ps1' : 'install.sh'
}

export type InstallOs = 'macos' | 'linux' | 'windows' | 'other'

/** The system a browser runs on, for the command shown first; phones and the unknown are `other`. */
export function installOs(userAgent: string | null): InstallOs {
  const ua = userAgent ?? ''
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'other'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos'
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux'
  return 'other'
}

const REF = /^[A-Za-z0-9._][A-Za-z0-9._/-]{0,99}$/

/**
 * `?ref=<branch|tag>`: `null` when absent or empty, `false` when it is not a plain ref (it is
 * written into the scripts, so only the characters git refs commonly use pass).
 */
export function parseRef(search: string): string | null | false {
  const ref = new URLSearchParams(search).get('ref')
  if (ref === null || ref === '') return null
  if (!REF.test(ref) || ref.includes('..') || ref.endsWith('/') || ref.endsWith('.lock')) return false
  return ref
}

/** The lines that hold each script's default ref; a test runs them over the real files. */
const DEFAULT_REF: Record<InstallScriptName, { pattern: RegExp; replace: (ref: string) => string }> = {
  'install.sh': {
    pattern: /^REF="\$\{REMOTE_HARNESS_REF:-\$\{CLAUDE_REMOTE_REF:-main\}\}"$/m,
    replace: (ref) => `REF="\${REMOTE_HARNESS_REF:-\${CLAUDE_REMOTE_REF:-${ref}}}"`,
  },
  'install.ps1': {
    pattern: /^ {2}\$DefaultRef = ''$/m,
    replace: (ref) => `  $DefaultRef = '${ref}'`,
  },
}

/** The script with `ref` as its default version (flags and REMOTE_HARNESS_REF still win). */
export function installScript(name: InstallScriptName, text: string, ref: string | null): string {
  if (ref === null) return text
  const { pattern, replace } = DEFAULT_REF[name]
  if (!pattern.test(text)) throw new Error(`${name}: default ref line not found`)
  return text.replace(pattern, () => replace(ref))
}
