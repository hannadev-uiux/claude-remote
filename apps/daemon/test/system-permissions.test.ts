import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import {
  classifyAccessibility,
  classifyFolderAccess,
  classifyFullDiskAccess,
  classifyKeychain,
} from '../src/features/system-permissions/classify.ts'
import { registerSystemPermissionsFeature } from '../src/features/system-permissions/index.ts'
import { probeAutomation } from '../src/infra/accessibility.ts'
import { probeFolderAccess } from '../src/infra/fs.ts'
import { MessageRouter } from '../src/transport/router.ts'
import { fakeConnection, fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(code) as NodeJS.ErrnoException
  error.code = code
  return error
}

describe('classifyFolderAccess', () => {
  test('a readable folder is allowed', () => {
    expect(classifyFolderAccess(null)).toBe('allowed')
  })

  test('a permission error is denied', () => {
    expect(classifyFolderAccess(errno('EACCES'))).toBe('denied')
    expect(classifyFolderAccess(errno('EPERM'))).toBe('denied')
  })

  test('any other error is omitted', () => {
    expect(classifyFolderAccess(errno('ENOENT'))).toBeNull()
    expect(classifyFolderAccess(errno('ENOTDIR'))).toBeNull()
  })
})

describe('classifyFullDiskAccess', () => {
  test('not available outside macOS', () => {
    expect(classifyFullDiskAccess('linux', ['allowed', 'allowed', 'allowed'])).toBeNull()
  })

  test('denied when any well-known folder is denied', () => {
    expect(classifyFullDiskAccess('darwin', ['allowed', 'denied', 'allowed'])).toBe('denied')
  })

  test('allowed only when every well-known folder is allowed', () => {
    expect(classifyFullDiskAccess('darwin', ['allowed', 'allowed', 'allowed'])).toBe('allowed')
  })

  test('not available when the well-known folders could not be classified', () => {
    expect(classifyFullDiskAccess('darwin', [null, null, null])).toBe('not_available')
    expect(classifyFullDiskAccess('darwin', [])).toBe('not_available')
  })
})

describe('classifyAccessibility', () => {
  test('not available outside macOS', () => {
    expect(classifyAccessibility('linux', 0)).toBeNull()
  })

  test('allowed on exit 0', () => {
    expect(classifyAccessibility('darwin', 0)).toBe('allowed')
  })

  test('denied on a nonzero exit', () => {
    expect(classifyAccessibility('darwin', 1)).toBe('denied')
  })
})

describe('classifyKeychain', () => {
  test('not available without a real secret store', () => {
    expect(classifyKeychain('file', true)).toBe('not_available')
    expect(classifyKeychain('file', false)).toBe('not_available')
  })

  test('allowed when the real store works', () => {
    expect(classifyKeychain('keychain', true)).toBe('allowed')
    expect(classifyKeychain('secret-tool', true)).toBe('allowed')
  })

  test('denied when the real store fails', () => {
    expect(classifyKeychain('keychain', false)).toBe('denied')
    expect(classifyKeychain('secret-tool', false)).toBe('denied')
  })
})

describe('probeFolderAccess', () => {
  test('null when the folder is listable', async () => {
    const dir = join(home.dir(), 'proj')
    await mkdir(dir, { recursive: true })
    expect(await probeFolderAccess(dir)).toBeNull()
  })

  test('an ENOENT error for a folder that does not exist', async () => {
    const error = await probeFolderAccess(join(home.dir(), 'missing'))
    expect(error?.code).toBe('ENOENT')
  })
})

describe('probeAutomation', () => {
  test('runs osascript against Finder and passes the result through', async () => {
    const exec = fakeExecutor(() => ({ exitCode: 0, stderr: '' }))
    expect(await probeAutomation(exec)).toEqual({ exitCode: 0, stderr: '' })
    expect(exec.calls[0]).toMatchObject({
      file: 'osascript',
      args: ['-e', 'tell application "Finder" to get name'],
    })
  })

  test('passes a denied exit through', async () => {
    const exec = fakeExecutor(() => ({ exitCode: 1, stderr: 'execution error: … (-1743)' }))
    expect(await probeAutomation(exec)).toEqual({ exitCode: 1, stderr: 'execution error: … (-1743)' })
  })
})

const onMac = process.platform === 'darwin'

describe('machine.permissions', () => {
  function setup(respond: Parameters<typeof fakeExecutor>[0] = () => undefined) {
    const router = new MessageRouter(silentLogger)
    const exec = fakeExecutor(respond)
    const profiles = [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }]
    const projects = (profileId: string) =>
      profileId === 'claudin' ? [{ cwd: join(home.dir(), 'proj') }] : []
    registerSystemPermissionsFeature({ router, exec, profiles }, projects, home.dir())
    return { router, exec }
  }

  async function ask(router: MessageRouter) {
    const connection = fakeConnection()
    await router.dispatch({ type: 'machine.permissions', id: '1' }, connection)
    return connection.sent.at(-1) as Extract<ServerMessage, { type: 'machine.permissions.results' }>
  }

  test('desktopNotifications is always not_available, and keychain is always reported', async () => {
    await mkdir(join(home.dir(), 'proj'), { recursive: true })
    const { router } = setup()
    const reply = await ask(router)
    expect(reply.permissions).toContainEqual({ id: 'desktopNotifications', status: 'not_available' })
    expect(reply.permissions.some((p) => p.id === 'keychain')).toBe(true)
  })

  test('folderAccess is left out entirely when no checked folder exists', async () => {
    const { router } = setup()
    const reply = await ask(router)
    expect(reply.permissions.find((p) => p.id === 'folderAccess')).toBeUndefined()
  })

  test('an existing recent project folder is reported allowed', async () => {
    await mkdir(join(home.dir(), 'proj'), { recursive: true })
    const { router } = setup()
    const reply = await ask(router)
    const folderAccess = reply.permissions.find((p) => p.id === 'folderAccess')
    expect(folderAccess?.status).toBe('allowed')
    expect(folderAccess?.entries).toContainEqual({ path: join(home.dir(), 'proj'), status: 'allowed' })
  })

  test.skipIf(!onMac)('macOS: full disk access, accessibility and keychain all resolve', async () => {
    await mkdir(join(home.dir(), 'Desktop'), { recursive: true })
    await mkdir(join(home.dir(), 'Documents'), { recursive: true })
    await mkdir(join(home.dir(), 'Downloads'), { recursive: true })
    await mkdir(join(home.dir(), 'proj'), { recursive: true })
    const { router } = setup((call) => {
      if (call.file === 'osascript') return { exitCode: 0, stderr: '' }
      if (call.file === 'security') return { exitCode: 44, stderr: 'not found' }
      return undefined
    })
    const reply = await ask(router)
    expect(reply.permissions).toContainEqual({ id: 'fullDiskAccess', status: 'allowed' })
    expect(reply.permissions).toContainEqual({ id: 'accessibility', status: 'allowed' })
    // No keychain entry exists yet (`security` was told "not found"): the live get() fails.
    expect(reply.permissions).toContainEqual({ id: 'keychain', status: 'denied' })
  })

  test.skipIf(!onMac)(
    'macOS: no well-known folder existing reports full disk access not_available',
    async () => {
      // None of Desktop/Documents/Downloads exist under this temp home: classifyFullDiskAccess has
      // nothing to go on (its own unit tests cover the denied/allowed branches directly).
      const { router } = setup((call) =>
        call.file === 'osascript' ? { exitCode: 1, stderr: '(-1743)' } : undefined,
      )
      const reply = await ask(router)
      expect(reply.permissions).toContainEqual({ id: 'fullDiskAccess', status: 'not_available' })
      expect(reply.permissions).toContainEqual({ id: 'accessibility', status: 'denied' })
    },
  )
})

describe('machine.openSettingsPane', () => {
  function setup() {
    const router = new MessageRouter(silentLogger)
    const exec = fakeExecutor()
    const profiles = [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }]
    registerSystemPermissionsFeature({ router, exec, profiles }, () => [], home.dir())
    return { router, exec }
  }

  test('acknowledges the request', async () => {
    const { router } = setup()
    const connection = fakeConnection()
    await router.dispatch({ type: 'machine.openSettingsPane', id: '1', pane: 'fullDiskAccess' }, connection)
    expect(connection.sent.at(-1)).toMatchObject({ type: 'ack' })
  })

  test.skipIf(!onMac)('opens the Full Disk Access pane', async () => {
    const { router, exec } = setup()
    await router.dispatch(
      { type: 'machine.openSettingsPane', id: '1', pane: 'fullDiskAccess' },
      fakeConnection(),
    )
    expect(exec.calls).toContainEqual(
      expect.objectContaining({
        file: 'open',
        args: ['x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'],
      }),
    )
  })

  test.skipIf(!onMac)('opens the Automation pane for the accessibility row', async () => {
    const { router, exec } = setup()
    await router.dispatch(
      { type: 'machine.openSettingsPane', id: '1', pane: 'accessibility' },
      fakeConnection(),
    )
    expect(exec.calls).toContainEqual(
      expect.objectContaining({
        file: 'open',
        args: ['x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'],
      }),
    )
  })
})
