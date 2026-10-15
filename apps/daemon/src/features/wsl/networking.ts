import type { NetworkInterfaceInfo } from 'node:os'
import { isTailscaleAddress } from '../../infra/network.ts'
import { readIniValue, setIniValue } from './ini.ts'

/**
 * WSL2 networking mode from `%UserProfile%\.wslconfig` (`[wsl2] networkingMode`), lowercased.
 * `nat` is the default: Tailscale on Windows is not visible inside WSL then.
 */
export function wslNetworkingMode(wslconfig: string | null): string {
  return readIniValue(wslconfig, 'wsl2', 'networkingMode')?.toLowerCase() || 'nat'
}

/** Merges `[wsl2] networkingMode=mirrored` into `.wslconfig` (unchanged text when already set). */
export function enableMirroredNetworking(wslconfig: string | null): string {
  return setIniValue(wslconfig, 'wsl2', 'networkingMode', 'mirrored')
}

/**
 * Where the Tailscale address comes from inside WSL: `wsl` = Tailscale runs in the distribution
 * (its `tailscale0` interface), `mirrored` = the Windows Tailscale adapter seen through mirrored networking.
 */
export type WslTailscaleSource = 'wsl' | 'mirrored' | 'unknown'

export type WslTailscale = { address: string; source: WslTailscaleSource }

/** The Tailscale (100.64.0.0/10) address visible in WSL and where it comes from; null when there is none. */
export function findWslTailscale(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  mode: string,
): WslTailscale | null {
  let fallback: WslTailscale | null = null
  for (const [name, infos] of Object.entries(interfaces)) {
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal || !isTailscaleAddress(info.address)) continue
      if (name.startsWith('tailscale')) return { address: info.address, source: 'wsl' }
      fallback ??= { address: info.address, source: mode === 'mirrored' ? 'mirrored' : 'unknown' }
    }
  }
  return fallback
}

/** `C:\Users\me` from `cmd.exe /c echo %UserProfile%` (last non-empty line); null when not expanded. */
export function parseCmdEcho(stdout: string): string | null {
  const line = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .at(-1)
  if (!line || line.includes('%')) return null
  return line
}
