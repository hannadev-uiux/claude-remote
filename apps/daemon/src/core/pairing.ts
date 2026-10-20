/** The link the app scans to pair (`remote-harness pair` and the tray's QR show the same one). */
export function pairingUrl(host: string, port: number, token: string): string {
  const params = new URLSearchParams({ host, port: String(port), token })
  return `claude-remote://pair?${params.toString()}`
}

/** `host:port` as the tray shows it; IPv6 hosts in brackets. */
export function pairingAddress(host: string, port: number): string {
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`
}
