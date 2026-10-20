/**
 * Screenshot demo: runs the real daemon in a throwaway environment full of fictional sessions.
 *
 *   pnpm --filter @remote-harness/daemon demo            # start (Ctrl+C stops and cleans up)
 *   pnpm --filter @remote-harness/daemon demo --clean    # remove what an interrupted run left
 *   … demo --root <dir>                                  # another root (default /Users/Shared on macOS)
 *
 * Isolation: its own data home, file token store, tmux server (`TMUX_TMPDIR`, no `TMUX`), ports,
 * `HOME` and host name; push off. Only the paths in its manifest are created and removed.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  conflictingPaths,
  DEMO_HOOK_PORT,
  DEMO_HOST_NAME,
  DEMO_REPOS,
  DEMO_SESSIONS,
  DEMO_TMUX_SESSION,
  DEMO_WS_PORT,
  type DemoLayout,
  type DemoSession,
  demoConfig,
  demoLayout,
  paneText,
  projectDirName,
  sessionCwd,
  statusLineBody,
  transcriptLines,
} from './demo-data.ts'

const DAEMON_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const rootArg = args.indexOf('--root')
const root =
  rootArg >= 0 && args[rootArg + 1]
    ? args[rootArg + 1]!
    : process.platform === 'darwin'
      ? '/Users/Shared'
      : join(tmpdir(), 'remote-harness-demo')
const layout = demoLayout(root)
const manifestPath = join(root, '.remote-harness-demo.json')

/** The environment of everything the demo runs: no way back to the user's tmux, home or daemon. */
const binDir = join(layout.home, 'bin')
const env: NodeJS.ProcessEnv = {
  ...process.env,
  // Stubs first: the profiles are offered without the real agents, and nothing real is launched.
  PATH: `${binDir}:${process.env.PATH ?? ''}`,
  HOME: root,
  TMUX_TMPDIR: layout.tmuxDir,
  REMOTE_HARNESS_HOME: layout.home,
  REMOTE_HARNESS_TOKEN_STORE: 'file',
  REMOTE_HARNESS_HOST_NAME: DEMO_HOST_NAME,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Demo',
  GIT_AUTHOR_EMAIL: 'demo@example.com',
  GIT_COMMITTER_NAME: 'Demo',
  GIT_COMMITTER_EMAIL: 'demo@example.com',
}
for (const name of [
  'TMUX',
  'TMUX_PANE',
  'CLAUDE_CONFIG_DIR',
  'CLAUDE_REMOTE_HOME',
  'CLAUDE_REMOTE_PROFILE',
]) {
  delete env[name]
}

function readManifest(): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

/**
 * The demo's tmux socket, named explicitly: tmux falls back to the user's default server when
 * `TMUX_TMPDIR` does not exist, so the script never relies on it alone.
 */
const tmuxSocket = join(layout.tmuxDir, `tmux-${process.getuid?.() ?? 0}`, 'default')

function tmux(...tmuxArgs: string[]): string {
  return execFileSync('tmux', ['-u', '-S', tmuxSocket, ...tmuxArgs], { env, encoding: 'utf8' }).trim()
}

function git(cwd: string, ...gitArgs: string[]): void {
  execFileSync('git', gitArgs, { cwd, env, stdio: 'ignore' })
}

function clean(): void {
  try {
    if (existsSync(tmuxSocket)) tmux('kill-server')
  } catch {
    // No server left.
  }
  const manifest = readManifest()
  for (const path of manifest) rmSync(path, { recursive: true, force: true })
  rmSync(manifestPath, { force: true })
  console.log(
    manifest.length > 0 ? `Removed ${manifest.length} demo folders from ${root}.` : 'Nothing to clean.',
  )
}

if (args.includes('--clean')) {
  clean()
  process.exit(0)
}

const conflicts = conflictingPaths(layout.owned, readManifest(), existsSync)
if (conflicts.length > 0) {
  console.error(
    `These already exist and are not the demo's, so nothing was created:\n  ${conflicts.join('\n  ')}`,
  )
  console.error('Pick another root with --root <dir>.')
  process.exit(1)
}
// Leftovers of an interrupted run start over.
if (readManifest().length > 0) clean()
writeFileSync(manifestPath, JSON.stringify(layout.owned, null, 2))

const now = Date.now()
const token = randomBytes(32).toString('base64url')
const hookSecret = randomBytes(24).toString('base64url')
let daemon: ChildProcess | undefined
let stopping = false

/**
 * The daemon goes first: while it runs it reaches tmux through `TMUX_TMPDIR`, which must still exist
 * when it does, or its commands would land on the user's own tmux server.
 */
async function stop(code = 0): Promise<never> {
  if (stopping) return new Promise<never>(() => {})
  stopping = true
  const child = daemon
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve))
    child.kill('SIGTERM')
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000)
    await exited
    clearTimeout(timer)
  }
  clean()
  process.exit(code)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
process.on('uncaughtException', (error) => {
  console.error(error)
  void stop(1)
})

function writeSandbox(l: DemoLayout): void {
  mkdirSync(dirname(tmuxSocket), { recursive: true, mode: 0o700 })
  mkdirSync(l.panesDir, { recursive: true })
  mkdirSync(binDir, { recursive: true })
  for (const agent of ['claude', 'codex']) {
    writeFileSync(
      join(binDir, agent),
      '#!/bin/sh\necho "Remote Harness demo: no agent runs here."\nexec sleep 86400\n',
      {
        mode: 0o755,
      },
    )
  }
  writeFileSync(join(l.home, 'config.json'), `${JSON.stringify(demoConfig(), null, 2)}\n`)
  writeFileSync(join(l.home, 'token'), token, { mode: 0o600 })
  writeFileSync(join(l.home, 'hook-secret'), hookSecret, { mode: 0o600 })
  for (const dir of Object.values(l.configDirs)) mkdirSync(join(dir, 'projects'), { recursive: true })
  mkdirSync(join(l.configDirs.codex, 'sessions'), { recursive: true })

  for (const repo of DEMO_REPOS) {
    const cwd = join(l.code, repo.name)
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(cwd, 'README.md'), `# ${repo.name}\n`)
    git(cwd, 'init', '-q', '-b', 'main')
    git(cwd, 'add', '.')
    git(cwd, 'commit', '-q', '-m', 'Initial commit')
    for (const branch of repo.branches.filter((b) => b !== 'main')) git(cwd, 'checkout', '-q', '-b', branch)
    for (const worktree of repo.worktrees) {
      git(cwd, 'worktree', 'add', '-q', join('.claude', 'worktrees', worktree.name), '-b', worktree.branch)
    }
  }
}

function transcriptPath(session: DemoSession): string {
  const dir = demoConfigDir(session.profileId)
  return join(dir, 'projects', projectDirName(sessionCwd(layout.code, session)), `${session.id}.jsonl`)
}

function demoConfigDir(profileId: string): string {
  const dirs = layout.configDirs as Record<string, string>
  return dirs[profileId] ?? layout.configDirs.personal
}

function writeTranscripts(): void {
  for (const session of DEMO_SESSIONS) {
    const path = transcriptPath(session)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${transcriptLines(session, sessionCwd(layout.code, session), now).join('\n')}\n`)
    const at = new Date(now - session.minutesAgo * 60_000)
    utimesSync(path, at, at)
  }
}

/** One tmux window per live session, showing its terminal; returns the pane of each session. */
function startPanes(): Map<string, string> {
  const panes = new Map<string, string>()
  const live = DEMO_SESSIONS.filter((s) => s.state !== 'ended')
  live.forEach((session, i) => {
    const file = join(layout.panesDir, `${session.id}.txt`)
    writeFileSync(file, paneText(session))
    const command = `printf '\\033[2J\\033[H'; cat '${file}'; exec sleep 86400`
    const cwd = sessionCwd(layout.code, session)
    const pane =
      i === 0
        ? tmux(
            'new-session',
            '-d',
            '-P',
            '-F',
            '#{pane_id}',
            '-s',
            DEMO_TMUX_SESSION,
            '-x',
            '60',
            '-y',
            '40',
            '-c',
            cwd,
            '-n',
            session.repo,
            command,
          )
        : tmux(
            'new-window',
            '-P',
            '-F',
            '#{pane_id}',
            '-t',
            DEMO_TMUX_SESSION,
            '-c',
            cwd,
            '-n',
            session.repo,
            command,
          )
    panes.set(session.id, pane)
  })
  return panes
}

/** Idle sessions come back from `state.json` with their past activity time, like after a restart. */
function writeLinks(panes: Map<string, string>): void {
  const links = DEMO_SESSIONS.filter((s) => panes.has(s.id)).map((s) => ({
    id: s.id,
    profileId: s.profileId,
    paneId: panes.get(s.id),
    cwd: sessionCwd(layout.code, s),
    title: s.title,
    transcriptPath: transcriptPath(s),
    updatedAt: new Date(now - s.minutesAgo * 60_000).toISOString(),
  }))
  writeFileSync(join(layout.home, 'state.json'), `${JSON.stringify({ links }, null, 2)}\n`)
}

function post(path: string, body: unknown, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = request(
      {
        host: '127.0.0.1',
        port: DEMO_HOOK_PORT,
        path,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data),
          'x-claude-remote-secret': hookSecret,
          ...headers,
        },
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      },
    )
    req.on('error', reject)
    req.end(data)
  })
}

async function waitForDaemon(): Promise<void> {
  for (let i = 0; i < 150; i++) {
    if (daemon?.exitCode !== null && daemon?.exitCode !== undefined) break
    try {
      await post('/statusline', {})
      return
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  console.error(`The demo daemon did not start; see ${join(layout.home, 'daemon.log')}.`)
  await stop(1)
}

function hookHeaders(session: DemoSession, pane: string): Record<string, string> {
  return { 'x-claude-remote-pane': pane, 'x-claude-remote-profile': session.profileId }
}

function hookBody(session: DemoSession, event: string, extra: Record<string, unknown> = {}) {
  return {
    session_id: session.id,
    transcript_path: transcriptPath(session),
    cwd: sessionCwd(layout.code, session),
    permission_mode: session.permissionMode,
    hook_event_name: event,
    ...extra,
  }
}

/** Keeps the permission request open; asks again when it is answered or times out. */
async function holdPermission(session: DemoSession, pane: string): Promise<void> {
  const permission = session.permission
  if (!permission) return
  while (!stopping) {
    try {
      await post(
        '/hooks/PermissionRequest',
        hookBody(session, 'PermissionRequest', {
          tool_name: permission.toolName,
          tool_input: permission.input,
        }),
        hookHeaders(session, pane),
      )
    } catch {
      if (stopping) return
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
}

writeSandbox(layout)
writeTranscripts()
const panes = startPanes()
writeLinks(panes)

const log = openSync(join(layout.home, 'daemon.log'), 'a')
daemon = spawn(join(DAEMON_DIR, 'node_modules', '.bin', 'tsx'), ['src/cli.ts', 'start', '--dev'], {
  cwd: DAEMON_DIR,
  env,
  stdio: ['ignore', log, log],
})
daemon.on('exit', (code) => {
  if (stopping) return
  console.error(`The demo daemon exited (${code}); see ${join(layout.home, 'daemon.log')}.`)
  void stop(1)
})
await waitForDaemon()

for (const session of DEMO_SESSIONS) {
  const pane = panes.get(session.id)
  if (!pane) continue
  const status = statusLineBody(session, transcriptPath(session), now)
  if (status) await post('/statusline', status, { 'x-claude-remote-profile': session.profileId })
  if (session.state === 'running') {
    const prompt = [...session.entries].reverse().find((e) => e.kind === 'user')
    await post(
      '/hooks/UserPromptSubmit',
      hookBody(session, 'UserPromptSubmit', { prompt: prompt?.kind === 'user' ? prompt.text : '' }),
      hookHeaders(session, pane),
    )
  }
  if (session.state === 'waiting') void holdPermission(session, pane)
}

const link = `remoteharness://pair?host=127.0.0.1&port=${DEMO_WS_PORT}&token=${token}`
console.log(`Remote Harness demo running in ${root} (machine "${DEMO_HOST_NAME}").`)
console.log(`\nPair a simulator:\n  xcrun simctl openurl booted '${link}'\n\nOr open: ${link}`)
console.log(`\nDaemon log: ${join(layout.home, 'daemon.log')}\nCtrl+C stops the demo and removes it.`)
