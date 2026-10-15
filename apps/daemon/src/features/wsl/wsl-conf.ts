import { BACKUP_SUFFIX } from '../hooks/installer.ts'
import { readIniValue, setIniValue } from './ini.ts'

export const WSL_CONF = '/etc/wsl.conf'

/** True when `/etc/wsl.conf` asks WSL to boot systemd (`[boot] systemd=true`). */
export function wslConfHasSystemd(text: string | null): boolean {
  return readIniValue(text, 'boot', 'systemd')?.toLowerCase() === 'true'
}

/** Merges `[boot] systemd=true` into `/etc/wsl.conf` (unchanged text when already set). */
export function enableSystemdInWslConf(text: string | null): string {
  return setIniValue(text, 'boot', 'systemd', 'true')
}

/**
 * The root-only part of writing `/etc/wsl.conf`, run as `sudo sh -c <script> sh <merged> <target>`:
 * backup of the current file (when there is one), then copy to a temp file next to it and rename (atomic).
 */
export function wslConfSudoArgs(mergedFile: string, target: string, hasCurrent: boolean): string[] {
  const backup = hasCurrent ? `cp -p "$2" "$2${BACKUP_SUFFIX}" && ` : ''
  const script = `${backup}install -m 644 "$1" "$2.claude-remote.tmp" && mv -f "$2.claude-remote.tmp" "$2"`
  return ['sh', '-c', script, 'sh', mergedFile, target]
}

/** Shell form of `sudo <args>` to show the user exactly what runs. */
export function displayCommand(file: string, args: readonly string[]): string {
  const quote = (arg: string) => (/^[\w./:=@%+-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`)
  return [file, ...args].map(quote).join(' ')
}
