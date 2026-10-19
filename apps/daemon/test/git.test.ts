import { describe, expect, test } from 'vitest'
import { GitClient } from '../src/infra/git.ts'
import { type ExecCall, fakeExecutor } from './helpers.ts'

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

  test('removeWorktree runs from the main checkout, prunes and deletes the branch safely or by force', async () => {
    const exec = fakeExecutor(() => undefined)
    const git = new GitClient(exec)
    const info = { path: '/w/app/.claude/worktrees/x', branch: 'x', mainRoot: '/w/app' }
    await git.removeWorktree(info)
    await git.removeWorktree(info, { force: true })
    expect(exec.calls.map((c) => c.args.join(' '))).toEqual([
      '-C /w/app worktree remove /w/app/.claude/worktrees/x',
      '-C /w/app worktree prune',
      '-C /w/app branch -d x',
      '-C /w/app worktree remove --force /w/app/.claude/worktrees/x',
      '-C /w/app worktree prune',
      '-C /w/app branch -D x',
    ])
  })
})
