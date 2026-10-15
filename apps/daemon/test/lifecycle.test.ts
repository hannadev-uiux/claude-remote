import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { LifecycleService, validateCwd } from '../src/features/lifecycle/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

function record(id: string, patch: Partial<SessionRecord>): SessionRecord {
  return {
    id,
    profileId: 'claudin',
    cwd: '/w',
    title: '',
    state: 'ended',
    permissionMode: null,
    controllable: false,
    paneId: null,
    updatedAt: '2026-10-14T10:00:00Z',
    subagents: [],
    backgroundTasks: 0,
    transcriptPath: null,
    ...patch,
  }
}

async function setup() {
  const project = join(home.dir(), 'proj')
  await mkdir(project, { recursive: true })
  const exec = fakeExecutor(() => ({ stdout: '%9\n' }))
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  store.dispose()
  const service = new LifecycleService(
    exec,
    store,
    [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
    '/bin-dir',
    home.dir(),
  )
  return { exec, store, service, project }
}

describe('validateCwd', () => {
  test('accepts directories inside home only', async () => {
    const dir = join(home.dir(), 'a')
    await mkdir(dir)
    expect(await validateCwd(dir, home.dir())).toBe(dir)
    await expect(validateCwd('/etc', home.dir())).rejects.toMatchObject({ code: 'invalid_cwd' })
    await expect(validateCwd(join(home.dir(), 'missing'), home.dir())).rejects.toMatchObject({
      code: 'invalid_cwd',
    })
    await expect(validateCwd(`${home.dir()}/../`, home.dir())).rejects.toMatchObject({ code: 'invalid_cwd' })
  })
})

describe('LifecycleService', () => {
  test('starts the profile launcher without attaching', async () => {
    const { exec, service, project } = await setup()
    expect(await service.start('claudin', project)).toEqual({ paneId: '%9' })
    expect(exec.calls[0]).toMatchObject({
      file: '/bin-dir/claudin',
      args: [],
      options: { cwd: project, env: { CLAUDE_REMOTE_NO_ATTACH: '1' } },
    })
    await expect(service.start('nope', project)).rejects.toMatchObject({ code: 'not_found' })
  })

  test('resumes an ended session in its original directory', async () => {
    const { exec, store, service, project } = await setup()
    store.upsert('old', {}, () => record('old', { cwd: project }))
    await service.resume('claudin', 'old')
    expect(exec.calls[0]).toMatchObject({ args: ['--resume', 'old'], options: { cwd: project } })
    store.upsert('live', {}, () => record('live', { cwd: project, controllable: true, paneId: '%1' }))
    await expect(service.resume('claudin', 'live')).rejects.toMatchObject({ code: 'bad_request' })
  })

  test('a repeated resume reuses the pane while it is alive', async () => {
    const { exec, store, project } = await setup()
    const alive = new Set(['%9'])
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      async (pane) => alive.has(pane),
    )
    store.upsert('old', {}, () => record('old', { cwd: project }))
    expect(await service.resume('claudin', 'old')).toEqual({ paneId: '%9' })
    expect(await service.resume('claudin', 'old')).toEqual({ paneId: '%9' })
    expect(exec.calls).toHaveLength(1)
    alive.clear()
    await service.resume('claudin', 'old')
    expect(exec.calls).toHaveLength(2)
  })

  test('concurrent resumes launch a single window', async () => {
    const { exec, store, project } = await setup()
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      async (pane) => pane === '%9',
    )
    store.upsert('old', {}, () => record('old', { cwd: project }))
    const results = await Promise.all([service.resume('claudin', 'old'), service.resume('claudin', 'old')])
    expect(results).toEqual([{ paneId: '%9' }, { paneId: '%9' }])
    expect(exec.calls).toHaveLength(1)
  })

  test('lists recent directories per profile', async () => {
    const { store, service } = await setup()
    store.upsert('a', {}, () => record('a', { cwd: '/w/a', updatedAt: '2026-10-14T10:00:00Z' }))
    store.upsert('b', { updatedAt: '2026-10-14T12:00:00Z' }, () => record('b', { cwd: '/w/b' }))
    store.upsert('c', { updatedAt: '2026-10-14T13:00:00Z' }, () => record('c', { cwd: '/w/a' }))
    store.upsert('d', {}, () => record('d', { cwd: '/w/x', profileId: 'other' }))
    expect(service.projects('claudin').map((p) => p.cwd)).toEqual(['/w/a', '/w/b'])
  })
})
