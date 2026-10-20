import { homedir } from 'node:os'
import { join } from 'node:path'
import type { MachinePermission, PermissionStatus } from '@remote-harness/protocol'
import { createTokenStore, selectTokenStore } from '../../core/secrets.ts'
import { probeAutomation } from '../../infra/accessibility.ts'
import { createDesktop } from '../../infra/desktop.ts'
import { probeFolderAccess } from '../../infra/fs.ts'
import { currentWsl, resolvePlatform } from '../../infra/platform.ts'
import type { DaemonContext } from '../../main.ts'
import {
  classifyAccessibility,
  classifyFolderAccess,
  classifyFullDiskAccess,
  classifyKeychain,
} from './classify.ts'

/** At most this many recent project folders are probed, on top of the well-known ones. */
const MAX_FOLDER_CHECKS = 20

/**
 * macOS System Settings panes `machine.openSettingsPane` can open. `accessibility`'s probe is
 * actually an Apple-events (Automation) check (error -1743), so it opens the Automation pane, not
 * the Accessibility one — matching what denying it and fixing it both actually mean here.
 */
const SETTINGS_PANE_URLS: Record<'fullDiskAccess' | 'accessibility', string> = {
  fullDiskAccess: 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
}

/** The well-known folders checked everywhere Full Disk Access is relevant. */
function wellKnownFolders(home: string): string[] {
  return [join(home, 'Desktop'), join(home, 'Documents'), join(home, 'Downloads')]
}

async function folderEntries(
  paths: readonly string[],
): Promise<{ path: string; status: PermissionStatus }[]> {
  const entries: { path: string; status: PermissionStatus }[] = []
  for (const path of paths) {
    const status = classifyFolderAccess(await probeFolderAccess(path))
    if (status) entries.push({ path, status })
  }
  return entries
}

export function registerSystemPermissionsFeature(
  ctx: Pick<DaemonContext, 'router' | 'exec' | 'profiles'>,
  projects: (profileId: string) => { cwd: string }[],
  home = homedir(),
) {
  const platform = resolvePlatform()
  const wsl = currentWsl(platform) !== null
  const desktop = createDesktop(ctx.exec, platform, { wsl })

  ctx.router.register('machine.permissions', async () => {
    const wellKnown = wellKnownFolders(home)
    const recent = [...new Set(ctx.profiles.flatMap((p) => projects(p.id).map((item) => item.cwd)))].slice(
      0,
      MAX_FOLDER_CHECKS,
    )
    const checked = [...new Set([...wellKnown, ...recent])]
    const entries = await folderEntries(checked)
    const byPath = new Map(entries.map((entry) => [entry.path, entry.status]))
    const wellKnownStatuses = wellKnown.map((path) => byPath.get(path) ?? null)

    const permissions: MachinePermission[] = []
    if (entries.length > 0) {
      const anyDenied = entries.some((entry) => entry.status === 'denied')
      permissions.push({ id: 'folderAccess', status: anyDenied ? 'denied' : 'allowed', entries })
    }
    const fullDisk = classifyFullDiskAccess(platform, wellKnownStatuses)
    if (fullDisk) permissions.push({ id: 'fullDiskAccess', status: fullDisk })
    if (platform === 'darwin' && !wsl) {
      const { exitCode } = await probeAutomation(ctx.exec)
      const accessibility = classifyAccessibility(platform, exitCode)
      if (accessibility) permissions.push({ id: 'accessibility', status: accessibility })
    }
    permissions.push({ id: 'desktopNotifications', status: 'not_available' })
    const { kind } = await selectTokenStore({ platform, exec: ctx.exec })
    // The daemon's own pairing token already exists by the time it's running (`ensureToken` at
    // boot); failing to read it back now means this store isn't actually usable right now.
    const token = await createTokenStore(kind, ctx.exec)
      .get()
      .catch(() => null)
    permissions.push({ id: 'keychain', status: classifyKeychain(kind, token !== null) })

    return { type: 'machine.permissions.results', permissions }
  })

  ctx.router.register('machine.openSettingsPane', async (msg) => {
    if (platform === 'darwin') await desktop.open(SETTINGS_PANE_URLS[msg.pane])
    return { type: 'ack' }
  })
}
