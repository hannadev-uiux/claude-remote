/** Background service of the daemon: a launchd LaunchAgent on macOS, a systemd user unit on Linux. */
export type ServiceKind = 'launchd' | 'systemd'

export type ServiceStatus = { loaded: boolean; detail: string }

export type ServiceInstallOptions = {
  nodePath: string
  /** dist/cli.js of the build the service runs. */
  cliPath: string
  logsDir: string
  /** PATH captured from the installing shell so tmux, git, rg and claude resolve in the service. */
  path: string
  /** 1024px PNG used as the app icon where the platform shows one (macOS). */
  iconPng?: string
}

/** systemd lingering: keeps the user's services running after logout and starts them at boot. */
export interface Linger {
  enabled(): Promise<boolean>
  /** Returns false when it could not be enabled (e.g. no permission). */
  enable(): Promise<boolean>
}

export interface ServiceManager {
  readonly kind: ServiceKind
  /** launchd label or systemd unit name, shown by `service status`. */
  readonly name: string
  /** False when the service manager cannot be used here (e.g. no `systemctl --user`). */
  available(): Promise<boolean>
  /** Writes, enables and (re)starts the service; returns the path of the written definition. */
  install(options: ServiceInstallOptions): Promise<string>
  uninstall(): Promise<void>
  status(): Promise<ServiceStatus>
  /** Present only where the service stops at logout without it (systemd). */
  readonly linger?: Linger
}

/** Removes duplicated PATH entries (login shells often repeat them), keeping the first occurrence. */
export function dedupePath(path: string): string {
  return [...new Set(path.split(':').filter(Boolean))].join(':')
}
