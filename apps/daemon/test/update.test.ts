import { mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  installerSourceDir,
  parseVersion,
  SourceUpdater,
  updateSource,
} from '../src/features/update/update.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

describe('updateSource', () => {
  test('accepts the installer checkout', () => {
    expect(
      updateSource('/home/u/.claude-remote/src/apps/daemon/dist/cli.js', '/home/u/.claude-remote/src'),
    ).toEqual({
      ok: true,
      root: '/home/u/.claude-remote/src',
    })
  })

  test('refuses a development clone and a missing build', () => {
    expect(updateSource('/code/claude-remote/apps/daemon/dist/cli.js', '/home/u/.claude-remote/src')).toEqual(
      {
        ok: false,
        reason: 'not-installer',
        root: '/code/claude-remote',
      },
    )
    expect(updateSource(null, '/home/u/.claude-remote/src')).toEqual({ ok: false, reason: 'not-built' })
  })
})

describe('installerSourceDir', () => {
  test('uses CLAUDE_REMOTE_SRC, else ~/.claude-remote/src', () => {
    expect(installerSourceDir({ CLAUDE_REMOTE_SRC: '/opt/cr' }, '/home/u')).toBe('/opt/cr')
    expect(installerSourceDir({ CLAUDE_REMOTE_SRC: '' }, '/home/u')).toBe('/home/u/.claude-remote/src')
  })

  test('resolves symlinks', async () => {
    const real = join(home.dir(), 'real')
    await mkdir(real)
    await symlink(real, join(home.dir(), 'link'))
    const resolved = installerSourceDir({ CLAUDE_REMOTE_SRC: join(home.dir(), 'link') })
    expect(resolved).toBe(installerSourceDir({ CLAUDE_REMOTE_SRC: real }))
    expect(resolved.endsWith('/real')).toBe(true)
  })
})

test('parseVersion', () => {
  expect(parseVersion('{"name":"x","version":"0.3.1"}')).toBe('0.3.1')
  expect(parseVersion('{"name":"x"}')).toBeNull()
  expect(parseVersion('not json')).toBeNull()
})

describe('SourceUpdater', () => {
  const root = '/home/u/.claude-remote/src'

  function git(answers: Record<string, { stdout?: string; stderr?: string; exitCode?: number }>) {
    return fakeExecutor(({ file, args }) => {
      expect(file).toBe('git')
      expect(args.slice(0, 2)).toEqual(['-C', root])
      return answers[args.slice(2).join(' ')]
    })
  }

  test('reports a new version and checks it out', async () => {
    const exec = git({
      'rev-parse HEAD': { stdout: 'aaa\n' },
      'rev-parse FETCH_HEAD': { stdout: 'bbbbbbbbb\n' },
      'show FETCH_HEAD:apps/daemon/package.json': { stdout: '{"version":"0.4.0"}' },
    })
    const updater = new SourceUpdater(exec, root)
    expect(await updater.fetch('main')).toEqual({
      status: 'available',
      commit: 'bbbbbbbbb',
      version: '0.4.0',
    })
    expect(exec.calls.map((c) => c.args.slice(2).join(' '))).toContain('fetch --quiet --depth 1 origin main')
    expect(await updater.checkout()).toBe(true)
    expect(exec.calls.at(-1)?.args.slice(2)).toEqual(['checkout', '--quiet', '--detach', 'FETCH_HEAD'])
  })

  test('says when it is already up to date', async () => {
    const exec = git({ 'rev-parse HEAD': { stdout: 'aaa\n' }, 'rev-parse FETCH_HEAD': { stdout: 'aaa\n' } })
    expect(await new SourceUpdater(exec, root).fetch('main')).toEqual({ status: 'current', commit: 'aaa' })
  })

  test('stops on local changes before fetching', async () => {
    const exec = git({ 'status --porcelain --untracked-files=no': { stdout: ' M install.sh\n' } })
    expect(await new SourceUpdater(exec, root).fetch('main')).toEqual({ status: 'dirty' })
    expect(exec.calls).toHaveLength(1)
  })

  test('reports fetch errors', async () => {
    const exec = git({
      'fetch --quiet --depth 1 origin nope': {
        exitCode: 128,
        stderr: "fatal: couldn't find remote ref nope\n",
      },
    })
    expect(await new SourceUpdater(exec, root).fetch('nope')).toEqual({
      status: 'failed',
      error: "fatal: couldn't find remote ref nope",
    })
  })
})
