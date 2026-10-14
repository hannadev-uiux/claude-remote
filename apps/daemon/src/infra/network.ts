import { type NetworkInterfaceInfo, networkInterfaces } from 'node:os'

/** True for addresses in the Tailscale CGNAT range 100.64.0.0/10. */
export function isTailscaleAddress(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  return a === 100 && b >= 64 && b <= 127
}

export function findTailscaleAddress(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): string | null {
  for (const infos of Object.values(interfaces)) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal && isTailscaleAddress(info.address)) return info.address
    }
  }
  return null
}
