import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import type { NetworkInterfaceInfo } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { BACKUP_SUFFIX } from '../src/features/hooks/installer.ts'
import { WslHost } from '../src/features/wsl/host.ts'
import { readIniValue, setIniValue } from '../src/features/wsl/ini.ts'
import {
  LEGACY_LOGON_TASK_NAME,
  LOGON_TASK_NAME,
  LogonTask,
  logonTaskAction,
  logonTaskCreateArgs,
  logonTaskCreateCommand,
} from '../src/features/wsl/logon-task.ts'
import {
  enableMirroredNetworking,
  findWslTailscale,
  parseCmdEcho,
  wslNetworkingMode,
} from '../src/features/wsl/networking.ts'
import {
  displayCommand,
  enableSystemdInWslConf,
  wslConfHasSystemd,
  wslConfSudoArgs,
} from '../src/features/wsl/wsl-conf.ts'
import { detectWsl, isWslKernel, systemdIsPid1 } from '../src/infra/platform.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

describe('WSL detection', () => {
  test('recognizes WSL kernels', () => {
    expect(isWslKernel('5.15.167.4-microsoft-standard-WSL2\n')).toBe(true)
    expect(isWslKernel('4.4.0-19041-Microsoft')).toBe(true)
    expect(isWslKernel('6.8.0-45-generic')).toBe(false)
  })

  test('flags Linux inside WSL with the distribution name', () => {
    const osrelease = '5.15.167.4-microsoft-standard-WSL2'
    expect(detectWsl({ platform: 'linux', osrelease, env: { WSL_DISTRO_NAME: 'Ubuntu' } })).toEqual({
      distro: 'Ubuntu',
    })
    expect(
      detectWsl({ platform: 'linux', osrelease: null, version: 'Linux version 5.15 (Microsoft)' }),
    ).toEqual({ distro: null })
    expect(detectWsl({ platform: 'linux', osrelease: '6.8.0-generic', version: 'Linux version 6.8.0' })).toBe(
      null,
    )
    expect(detectWsl({ platform: 'darwin', osrelease })).toBe(null)
  })

  test('systemd is PID 1 only when /proc/1/comm says so', () => {
    expect(systemdIsPid1(() => 'systemd\n')).toBe(true)
    expect(systemdIsPid1(() => 'init\n')).toBe(false)
    expect(systemdIsPid1(() => null)).toBe(false)
  })
})

describe('INI merge', () => {
  test('reads values case-insensitively, ignoring comments and quotes', () => {
    const text = '# comment\n[WSL2]\nmemory=8GB\nNetworkingMode = "Mirrored" # note\n[boot]\nsystemd=true\n'
    expect(readIniValue(text, 'wsl2', 'networkingMode')).toBe('Mirrored')
    expect(readIniValue(text, 'boot', 'systemd')).toBe('true')
    expect(readIniValue(text, 'boot', 'command')).toBeNull()
    expect(readIniValue(null, 'boot', 'systemd')).toBeNull()
  })

  test('adds the section to an empty or missing file', () => {
    expect(setIniValue(null, 'boot', 'systemd', 'true')).toBe('[boot]\nsystemd=true\n')
    expect(setIniValue('', 'boot', 'systemd', 'true')).toBe('[boot]\nsystemd=true\n')
  })

  test('keeps other sections and appends to an existing section', () => {
    const text = '[automount]\nenabled=true\n\n[boot]\ncommand=echo hi\n\n[user]\ndefault=me\n'
    expect(setIniValue(text, 'boot', 'systemd', 'true')).toBe(
      '[automount]\nenabled=true\n\n[boot]\ncommand=echo hi\nsystemd=true\n\n[user]\ndefault=me\n',
    )
  })

  test('replaces a different value in place and keeps CRLF line endings', () => {
    const text = '[wsl2]\r\nmemory=8GB\r\nnetworkingMode=NAT\r\n'
    expect(setIniValue(text, 'wsl2', 'networkingMode', 'mirrored')).toBe(
      '[wsl2]\r\nmemory=8GB\r\nnetworkingMode=mirrored\r\n',
    )
  })

  test('is idempotent: an existing value returns the text untouched', () => {
    const text = '[boot]\nsystemd = TRUE\n'
    expect(setIniValue(text, 'boot', 'systemd', 'true')).toBe(text)
    const once = setIniValue('[x]\na=1', 'boot', 'systemd', 'true')
    expect(once).toBe('[x]\na=1\n\n[boot]\nsystemd=true\n')
    expect(setIniValue(once, 'boot', 'systemd', 'true')).toBe(once)
  })
})

describe('WSL networking', () => {
  const info = (address: string): NetworkInterfaceInfo => ({
    address,
    family: 'IPv4',
    internal: false,
    netmask: '255.255.255.255',
    mac: '00:00:00:00:00:00',
    cidr: null,
  })

  test('networking mode defaults to NAT', () => {
    expect(wslNetworkingMode(null)).toBe('nat')
    expect(wslNetworkingMode('[wsl2]\nmemory=4GB\n')).toBe('nat')
    expect(wslNetworkingMode('[wsl2]\nnetworkingMode=Mirrored\n')).toBe('mirrored')
  })

  test('merges mirrored networking into .wslconfig', () => {
    expect(enableMirroredNetworking(null)).toBe('[wsl2]\nnetworkingMode=mirrored\n')
    const text = '[wsl2]\r\nmemory=8GB\r\n'
    expect(enableMirroredNetworking(text)).toBe('[wsl2]\r\nmemory=8GB\r\nnetworkingMode=mirrored\r\n')
    expect(enableMirroredNetworking('[wsl2]\nnetworkingMode=mirrored\n')).toBe(
      '[wsl2]\nnetworkingMode=mirrored\n',
    )
  })

  test('tells Tailscale inside WSL from the mirrored Windows adapter', () => {
    const inside = { eth0: [info('172.20.1.2')], tailscale0: [info('100.101.1.2')] }
    expect(findWslTailscale(inside, 'nat')).toEqual({ address: '100.101.1.2', source: 'wsl' })
    const mirrored = { eth0: [info('192.168.0.10')], eth3: [info('100.90.2.3')] }
    expect(findWslTailscale(mirrored, 'mirrored')).toEqual({ address: '100.90.2.3', source: 'mirrored' })
    expect(findWslTailscale(mirrored, 'nat')).toEqual({ address: '100.90.2.3', source: 'unknown' })
    expect(findWslTailscale({ eth0: [info('172.20.1.2')] }, 'mirrored')).toBeNull()
  })

  test('parses the %UserProfile% echo', () => {
    expect(parseCmdEcho('C:\\Users\\me\r\n')).toBe('C:\\Users\\me')
    expect(parseCmdEcho('warning line\r\nC:\\Users\\Jo Doe\r\n\r\n')).toBe('C:\\Users\\Jo Doe')
    expect(parseCmdEcho('%UserProfile%\r\n')).toBeNull()
    expect(parseCmdEcho('')).toBeNull()
  })
})

describe('/etc/wsl.conf', () => {
  test('detects and merges [boot] systemd=true', () => {
    expect(wslConfHasSystemd(null)).toBe(false)
    expect(wslConfHasSystemd('[boot]\nsystemd=false\n')).toBe(false)
    expect(wslConfHasSystemd('[boot]\nsystemd=true\n')).toBe(true)
    expect(enableSystemdInWslConf('[boot]\nsystemd=false\n')).toBe('[boot]\nsystemd=true\n')
  })

  test('the sudo script backs up, writes a temp file and renames it', () => {
    const args = wslConfSudoArgs('/tmp/x/wsl.conf', '/etc/wsl.conf', true)
    expect(args.slice(0, 2)).toEqual(['sh', '-c'])
    expect(args[2]).toBe(
      `cp -p "$2" "$2${BACKUP_SUFFIX}" && install -m 644 "$1" "$2.claude-remote.tmp" && mv -f "$2.claude-remote.tmp" "$2"`,
    )
    expect(args.slice(3)).toEqual(['sh', '/tmp/x/wsl.conf', '/etc/wsl.conf'])
    expect(wslConfSudoArgs('/m', '/etc/wsl.conf', false)[2]).not.toContain('cp -p')
    expect(displayCommand('sudo', ['sh', '-c', "echo 'a'", 'sh', '/etc/wsl.conf'])).toBe(
      `sudo sh -c 'echo '\\''a'\\''' sh /etc/wsl.conf`,
    )
  })
})

describe('logon task', () => {
  test('starts the distribution at logon', () => {
    expect(logonTaskAction('Ubuntu')).toBe('wsl.exe -d Ubuntu --exec /bin/true')
    expect(logonTaskAction(null)).toBe('wsl.exe --exec /bin/true')
    expect(logonTaskAction('bad name; rm')).toBe('wsl.exe --exec /bin/true')
    expect(logonTaskCreateArgs('Ubuntu-24.04')).toEqual([
      '/Create',
      '/F',
      '/SC',
      'ONLOGON',
      '/TN',
      'Remote Harness',
      '/TR',
      'wsl.exe -d Ubuntu-24.04 --exec /bin/true',
    ])
    expect(logonTaskCreateCommand('Ubuntu')).toBe(
      'schtasks.exe /Create /F /SC ONLOGON /TN "Remote Harness" /TR "wsl.exe -d Ubuntu --exec /bin/true"',
    )
  })

  /** schtasks.exe over a set of task names. */
  function scheduler(initial: string[]) {
    const tasks = new Set(initial)
    const exec = fakeExecutor((c) => {
      const name = c.args[c.args.indexOf('/TN') + 1] ?? ''
      if (c.args[0] === '/Query') return { exitCode: tasks.has(name) ? 0 : 1 }
      if (c.args[0] === '/Create') tasks.add(name)
      if (c.args[0] === '/Delete') tasks.delete(name)
      return undefined
    })
    return { tasks, exec }
  }

  test('creates, queries and deletes it with schtasks.exe', async () => {
    const { tasks, exec } = scheduler([])
    const task = new LogonTask(exec, 'Ubuntu')
    expect(await task.exists()).toBe(false)
    expect(await task.remove()).toBe(false)
    expect(await task.create()).toEqual({ ok: true })
    expect([...tasks]).toEqual([LOGON_TASK_NAME])
    expect(await task.exists()).toBe(true)
    expect(await task.remove()).toBe(true)
    expect(tasks.size).toBe(0)
    expect(
      exec.calls.filter((c) => c.args[0] !== '/Query').map((c) => [c.file, ...c.args].join(' ')),
    ).toEqual([
      `schtasks.exe ${logonTaskCreateArgs('Ubuntu').join(' ')}`,
      `schtasks.exe /Delete /F /TN ${LOGON_TASK_NAME}`,
    ])
  })

  test('the task from before the rename counts, is replaced and is removed', async () => {
    const replaced = scheduler([LEGACY_LOGON_TASK_NAME])
    const task = new LogonTask(replaced.exec, 'Ubuntu')
    expect(await task.exists()).toBe(true)
    expect(await task.create()).toEqual({ ok: true })
    expect([...replaced.tasks]).toEqual([LOGON_TASK_NAME])

    const removed = scheduler([LEGACY_LOGON_TASK_NAME])
    expect(await new LogonTask(removed.exec, null).remove()).toBe(true)
    expect(removed.tasks.size).toBe(0)
  })

  test('reports why it could not be created', async () => {
    const exec = fakeExecutor(() => ({ exitCode: 1, stderr: 'ERROR: Access is denied.\r\n' }))
    expect(await new LogonTask(exec, 'Ubuntu').create()).toEqual({
      ok: false,
      error: 'ERROR: Access is denied.',
    })
  })
})

describe('WslHost', () => {
  /** Fakes interop: %UserProfile% maps to <temp>/mnt/c/Users/me. */
  function windowsExec(sudoExit = 0) {
    const windowsHome = join(home.dir(), 'mnt', 'c', 'Users', 'me')
    const exec = fakeExecutor((c) => {
      if (c.file === 'cmd.exe') return { stdout: 'C:\\Users\\me\r\n' }
      if (c.file === 'wslpath') return { stdout: `${windowsHome}\n` }
      if (c.file === 'sudo')
        return { exitCode: sudoExit, stderr: sudoExit ? 'sudo: 3 incorrect password attempts' : '' }
      return undefined
    })
    return { exec, windowsHome }
  }

  test('finds .wslconfig in %UserProfile% through cmd.exe and wslpath', async () => {
    const { exec, windowsHome } = windowsExec()
    const host = new WslHost(exec, { wsl: { distro: 'Ubuntu' } })
    expect(await host.wslconfigPath()).toBe(join(windowsHome, '.wslconfig'))
    expect(exec.calls.map((c) => [c.file, ...c.args].join(' '))).toEqual([
      'cmd.exe /c echo %UserProfile%',
      'wslpath -u C:\\Users\\me',
    ])
    const noInterop = new WslHost(
      fakeExecutor(() => ({ exitCode: 1 })),
      { wsl: { distro: null } },
    )
    expect(await noInterop.wslconfigPath()).toBeNull()
    expect(await noInterop.networkingMode()).toBeNull()
  })

  test('enables mirrored networking with a backup, idempotently', async () => {
    const { exec, windowsHome } = windowsExec()
    await mkdir(windowsHome, { recursive: true })
    const path = join(windowsHome, '.wslconfig')
    await writeFile(path, '[wsl2]\r\nmemory=8GB\r\n')
    const host = new WslHost(exec, { wsl: { distro: 'Ubuntu' } })
    expect(await host.networkingMode()).toBe('nat')
    expect(await host.enableMirroredNetworking()).toEqual({ path, changed: true })
    expect(readFileSync(path, 'utf8')).toBe('[wsl2]\r\nmemory=8GB\r\nnetworkingMode=mirrored\r\n')
    expect(readFileSync(`${path}${BACKUP_SUFFIX}`, 'utf8')).toBe('[wsl2]\r\nmemory=8GB\r\n')
    expect(await host.networkingMode()).toBe('mirrored')
    expect(await host.enableMirroredNetworking()).toEqual({ path, changed: false })
  })

  test('creates .wslconfig when there is none (no backup)', async () => {
    const { exec, windowsHome } = windowsExec()
    const host = new WslHost(exec, { wsl: { distro: 'Ubuntu' } })
    const path = join(windowsHome, '.wslconfig')
    expect(await host.enableMirroredNetworking()).toEqual({ path, changed: true })
    expect(readFileSync(path, 'utf8')).toBe('[wsl2]\nnetworkingMode=mirrored\n')
    expect(() => readFileSync(`${path}${BACKUP_SUFFIX}`)).toThrow()
  })

  test('enables systemd in wsl.conf through sudo only when needed', async () => {
    const wslConfPath = join(home.dir(), 'wsl.conf')
    await writeFile(wslConfPath, '[user]\ndefault=me\n')
    const { exec } = windowsExec()
    const host = new WslHost(exec, { wsl: { distro: 'Ubuntu' }, wslConfPath, systemdRunning: () => false })
    expect(host.systemdRunning()).toBe(false)
    expect(await host.systemdConfigured()).toBe(false)
    expect(await host.systemdCommand()).toContain(`sudo sh -c 'cp -p "$2"`)
    expect(await host.enableSystemd()).toEqual({ status: 'written' })
    const sudo = exec.calls.find((c) => c.file === 'sudo')
    expect(sudo?.args.slice(0, 2)).toEqual(['sh', '-c'])
    expect(sudo?.args.at(-1)).toBe(wslConfPath)
    expect(sudo?.options?.timeoutMs).toBeGreaterThan(60_000)

    await writeFile(wslConfPath, '[boot]\nsystemd=true\n')
    expect(await host.systemdConfigured()).toBe(true)
    exec.calls.length = 0
    expect(await host.enableSystemd()).toEqual({ status: 'unchanged' })
    expect(exec.calls).toEqual([])
  })

  test('reports a failed sudo', async () => {
    const { exec } = windowsExec(1)
    const host = new WslHost(exec, { wsl: { distro: 'Ubuntu' }, wslConfPath: join(home.dir(), 'none.conf') })
    expect(await host.enableSystemd()).toEqual({
      status: 'failed',
      error: 'sudo: 3 incorrect password attempts',
    })
  })
})
