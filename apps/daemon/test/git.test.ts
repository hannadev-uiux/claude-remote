import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { execaExecutor } from '../src/infra/exec.ts'
import { GitClient, type GitFs, lockPid, parseWorktreeList } from '../src/infra/git.ts'
import { type ExecCall, fakeExecutor, useTempHome } from './helpers.ts'

const sub = (call: ExecCall) => call.args.slice(2).join(' ')

describe('GitClient.worktreeInfo', () => {
  test('a linked worktree: branch, counts and the main checkout', async () => {
    const exec = fakeExecutor((call) => {
      switch (sub(call)) {
        case 'rev-parse --show-toplevel --git-dir --git-common-dir':
          return {
            stdout: '/w/app/.claude/worktrees/remote-1\n/w/app/.git/worktrees/remote-1\n/w/app/.git\n',
          }
        case 'symbolic-ref --short -q HEAD':
          return { stdout: 'remote-1\n' }
        case 'status --porcelain':
          return { stdout: ' M src/a.ts\n?? src/b.ts\n' }
        case 'rev-list --count HEAD --not --remotes':
          return { stdout: '3\n' }
        default:
          return undefined
      }
    })
    const info = await new GitClient(exec).worktreeInfo('/w/app/.claude/worktrees/remote-1/src')
    expect(info).toEqual({
      path: '/w/app/.claude/worktrees/remote-1',
      branch: 'remote-1',
      mainRoot: '/w/app',
      dirty: 2,
      unpushed: 3,
    })
  })

  test('the main checkout and folders outside git are null', async () => {
    const main = fakeExecutor((call) =>
      sub(call).startsWith('rev-parse') ? { stdout: '/w/app\n.git\n.git\n' } : undefined,
    )
    expect(await new GitClient(main).worktreeInfo('/w/app')).toBeNull()
    const outside = fakeExecutor(() => ({ exitCode: 128, stderr: 'fatal: not a git repository' }))
    expect(await new GitClient(outside).worktreeInfo('/tmp/x')).toBeNull()
  })

  test('a worktree without commits yet has zero unpushed', async () => {
    const exec = fakeExecutor((call) => {
      const args = sub(call)
      if (args.startsWith('rev-parse'))
        return { stdout: '/w/app/.claude/worktrees/x\n/w/app/.git/worktrees/x\n/w/app/.git\n' }
      if (args.startsWith('rev-list')) return { exitCode: 128, stderr: 'fatal: bad revision' }
      if (args.startsWith('symbolic-ref')) return { exitCode: 1 }
      return { stdout: '' }
    })
    expect(await new GitClient(exec).worktreeInfo('/w/app/.claude/worktrees/x')).toMatchObject({
      branch: null,
      dirty: 0,
      unpushed: 0,
    })
  })
})

describe('GitClient cleanup calls', () => {
  test('commitAll stages and commits only when something changed', async () => {
    const dirty = fakeExecutor((call) =>
      sub(call) === 'status --porcelain' ? { stdout: ' M a\n' } : undefined,
    )
    await new GitClient(dirty).commitAll('/wt', 'WIP')
    expect(dirty.calls.map(sub)).toEqual(['add -A', 'status --porcelain', 'commit --no-verify -m WIP'])
    const clean = fakeExecutor(() => ({ stdout: '' }))
    await new GitClient(clean).commitAll('/wt', 'WIP')
    expect(clean.calls.map(sub)).toEqual(['add -A', 'status --porcelain'])
  })

  test('push creates the upstream on origin and fails with git’s message', async () => {
    const ok = fakeExecutor(() => undefined)
    await new GitClient(ok).push('/wt')
    expect(ok.calls.map(sub)).toEqual(['push -u origin HEAD'])
    const failing = fakeExecutor(() => ({ exitCode: 1, stderr: 'error: failed to push some refs' }))
    await expect(new GitClient(failing).push('/wt')).rejects.toThrow('failed to push some refs')
  })

  test('errors carry the timeout or the exit code when git prints nothing', async () => {
    const killed = fakeExecutor(() => ({ exitCode: 1, timedOut: true }))
    await expect(new GitClient(killed).push('/wt')).rejects.toThrow('git push -u timed out after 60 s')
    const silent = fakeExecutor(() => ({ exitCode: 128 }))
    await expect(new GitClient(silent).push('/wt')).rejects.toThrow('git push -u exited with code 128')
  })
})

describe('worktree list and locks', () => {
  test('parseWorktreeList reads paths, branches and lock reasons', () => {
    const out = [
      'worktree /w/app',
      'HEAD abc',
      'branch refs/heads/main',
      '',
      'worktree /w/app/.claude/worktrees/x',
      'HEAD def',
      'branch refs/heads/feat/x',
      'locked claude session x (pid 4242 start Mon Oct 19 22:39:59 2026)',
      '',
      'worktree /w/app/.claude/worktrees/y',
      'detached',
      'locked',
      '',
    ].join('\n')
    expect(parseWorktreeList(out)).toEqual([
      { path: '/w/app', branch: 'main', locked: null },
      {
        path: '/w/app/.claude/worktrees/x',
        branch: 'feat/x',
        locked: 'claude session x (pid 4242 start Mon Oct 19 22:39:59 2026)',
      },
      { path: '/w/app/.claude/worktrees/y', branch: null, locked: '' },
    ])
  })

  test('lockPid reads the pid of the reason', () => {
    expect(lockPid('claude session x (pid 4242 start Mon)')).toBe(4242)
    expect(lockPid('moved to a USB drive')).toBeNull()
    expect(lockPid('')).toBeNull()
  })
})

describe('GitClient.removeWorktree', () => {
  const info = { path: '/w/app/.claude/worktrees/x', branch: 'x', mainRoot: '/w/app' }
  const list = (locked?: string) =>
    `worktree /w/app\nbranch refs/heads/main\n\nworktree ${info.path}\nbranch refs/heads/x\n${locked === undefined ? '' : `locked ${locked}\n`}`

  function setup(
    options: { locked?: string; alive?: boolean; renameError?: string; missing?: boolean } = {},
  ) {
    const exec = fakeExecutor((call) => {
      const cmd = sub(call)
      if (cmd === 'worktree list --porcelain') return { stdout: list(options.locked) }
      if (cmd.startsWith('rev-parse')) return { stdout: '/w/app/.git\n' }
      return undefined
    })
    const fsCalls: string[] = []
    const fs = {
      mkdir: vi.fn(async (p: string) => {
        fsCalls.push(`mkdir ${p}`)
        return undefined
      }),
      rename: vi.fn(async (from: string, to: string) => {
        if (options.renameError)
          throw Object.assign(new Error(`${options.renameError}: rename`), {
            code: options.renameError,
          })
        fsCalls.push(`rename ${from} -> ${to.replace(/-\d+$/, '-<ts>')}`)
      }),
      readdir: vi.fn(async () => ['x-1', 'old-2']),
      rm: vi.fn(async (p: string) => {
        fsCalls.push(`rm ${p}`)
      }),
      realpath: vi.fn(async (p: string) => {
        if (options.missing && p === info.path) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
        return p
      }),
    } as unknown as GitFs
    const git = new GitClient(exec, { fs, isAlive: () => options.alive ?? false })
    return { exec, fsCalls, git, cmds: () => exec.calls.map(sub) }
  }

  test('moves the folder into the git dir, prunes, deletes the branch, then purges the trash', async () => {
    const { git, cmds, fsCalls } = setup()
    const { purged } = await git.removeWorktree(info)
    await purged
    expect(cmds()).toEqual([
      'worktree list --porcelain',
      'rev-parse --path-format=absolute --git-common-dir',
      'worktree prune',
      'branch -d x',
    ])
    expect(fsCalls).toEqual([
      'mkdir /w/app/.git/remote-harness-trash',
      `rename ${info.path} -> /w/app/.git/remote-harness-trash/x-<ts>`,
      'rm /w/app/.git/remote-harness-trash/x-1',
      'rm /w/app/.git/remote-harness-trash/old-2',
    ])
  })

  test('forced removal deletes the branch with -D', async () => {
    const { git, cmds } = setup()
    await git.removeWorktree(info, { force: true })
    expect(cmds()).toContain('branch -D x')
  })

  test('a stale lock is removed first; a live one stops everything', async () => {
    const stale = setup({ locked: 'claude session x (pid 4242 start Mon)' })
    await stale.git.removeWorktree(info)
    expect(stale.cmds()[1]).toBe(`worktree unlock ${info.path}`)

    const live = setup({ locked: 'claude session x (pid 4242 start Mon)', alive: true })
    await expect(live.git.removeWorktree(info)).rejects.toThrow(/locked by a running process \(pid 4242\)/)
    expect(live.cmds()).toEqual(['worktree list --porcelain'])
    expect(live.fsCalls).toEqual([])
  })

  test('a worktree the agent already removed only leaves git records and the branch to clean', async () => {
    const { git, cmds, fsCalls } = setup({ missing: true, locked: 'claude session x (pid 4242 start Mon)' })
    await (await git.removeWorktree(info)).purged
    expect(cmds()).toEqual(['worktree prune', 'branch -d x'])
    expect(fsCalls).toEqual([])
  })

  test('the lock reports its process and whether it still runs', async () => {
    expect(await setup().git.worktreeLock('/w/app', info.path)).toBeNull()
    expect(
      await setup({ locked: 'claude session x (pid 4242 start Mon)', alive: true }).git.worktreeLock(
        '/w/app',
        info.path,
      ),
    ).toEqual({ reason: 'claude session x (pid 4242 start Mon)', pid: 4242, alive: true })
  })

  test('a failed move keeps the worktree and says why', async () => {
    const { git, cmds } = setup({ renameError: 'EPERM' })
    await expect(git.removeWorktree(info)).rejects.toThrow(
      'could not move the worktree folder: EPERM: rename',
    )
    expect(cmds()).not.toContain('worktree prune')
  })

  test('another file system falls back to git worktree remove with a long timeout', async () => {
    const { git, exec } = setup({ renameError: 'EXDEV' })
    await git.removeWorktree(info, { force: true })
    const remove = exec.calls.find((c) => sub(c).startsWith('worktree remove'))
    expect(sub(remove!)).toBe(`worktree remove --force ${info.path}`)
    expect(remove?.options?.timeoutMs).toBe(600_000)
  })
})

describe('GitClient.removeWorktree on a real repository', () => {
  const home = useTempHome()
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 't',
        GIT_AUTHOR_EMAIL: 't@t',
        GIT_COMMITTER_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@t',
      },
    })

  test('a clean worktree with ignored folders and a stale Claude Code lock goes away completely', async () => {
    const repo = join(home.dir(), 'app')
    await mkdir(repo, { recursive: true })
    git(repo, 'init', '-q', '-b', 'main')
    await writeFile(join(repo, '.gitignore'), 'node_modules/\n')
    await writeFile(join(repo, 'LICENSE'), 'MIT\n')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', 'init')
    const tree = join(repo, '.claude', 'worktrees', 'remote-1')
    git(repo, 'worktree', 'add', '-q', '-b', 'remote-1', tree)
    git(repo, 'worktree', 'lock', '--reason', 'claude session remote-1 (pid 999999 start Mon)', tree)
    await mkdir(join(tree, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(tree, 'node_modules', 'pkg', 'index.js'), '')

    const client = new GitClient(execaExecutor, { isAlive: () => false })
    const info = await client.worktreeInfo(tree)
    expect(info).toMatchObject({ dirty: 0, branch: 'remote-1' })
    const { purged } = await client.removeWorktree(info!)
    await purged

    expect(existsSync(tree)).toBe(false)
    expect(git(repo, 'worktree', 'list', '--porcelain')).not.toContain('remote-1')
    expect(git(repo, 'branch', '--list', 'remote-1').trim()).toBe('')
    expect(await readdir(join(repo, '.git', 'remote-harness-trash'))).toEqual([])
    expect(git(repo, 'status', '--porcelain').trim()).toBe('')
  })

  test('untracked files that are not ignored count as changes; ignored ones do not', async () => {
    const repo = join(home.dir(), 'app2')
    await mkdir(repo, { recursive: true })
    git(repo, 'init', '-q', '-b', 'main')
    await writeFile(join(repo, '.gitignore'), 'node_modules/\n')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', 'init')
    const tree = join(repo, 'wt')
    git(repo, 'worktree', 'add', '-q', '-b', 'wt', tree)
    await mkdir(join(tree, 'node_modules'), { recursive: true })
    await writeFile(join(tree, 'node_modules', 'a.js'), '')
    const client = new GitClient(execaExecutor)
    expect(await client.worktreeInfo(tree)).toMatchObject({ dirty: 0 })
    await writeFile(join(tree, 'notes.md'), 'todo\n')
    expect(await client.worktreeInfo(tree)).toMatchObject({ dirty: 1 })
  })
})
