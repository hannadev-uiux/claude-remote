import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, beforeEach } from 'vitest'
import type { ExecOptions, ExecResult, Executor } from '../src/infra/exec.ts'
import type { Connection } from '../src/transport/connection.ts'

/** Creates a fresh temp dir per test and points REMOTE_HARNESS_HOME at it. */
export function useTempHome(): { dir: () => string } {
  let dir = ''
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cr-test-'))
    process.env.REMOTE_HARNESS_HOME = join(dir, '.remote-harness')
  })
  afterEach(async () => {
    delete process.env.REMOTE_HARNESS_HOME
    await rm(dir, { recursive: true, force: true })
  })
  return { dir: () => dir }
}

/** \`args\` omits TmuxClient's global \`-u\` flag so tests read like the tmux command; \`rawArgs\` keeps it. */
export type ExecCall = {
  file: string
  args: readonly string[]
  rawArgs: readonly string[]
  options?: ExecOptions
}

/** Records calls and answers with a scripted responder. */
export function fakeExecutor(
  respond: (call: ExecCall) => Partial<ExecResult> | undefined = () => undefined,
): Executor & { calls: ExecCall[] } {
  const calls: ExecCall[] = []
  const exec = (async (file: string, args: readonly string[], options?: ExecOptions) => {
    const call = {
      file,
      args: file === 'tmux' && args[0] === '-u' ? args.slice(1) : args,
      rawArgs: args,
      options,
    }
    calls.push(call)
    const result = respond(call) ?? {}
    return { stdout: '', stderr: '', exitCode: 0, ...result }
  }) as Executor & { calls: ExecCall[] }
  exec.calls = calls
  return exec
}

export function fakeConnection(): Connection & { sent: ServerMessage[]; closeAll: () => void } {
  const sent: ServerMessage[] = []
  const handlers: Array<() => void> = []
  return {
    id: 'conn-1',
    foreground: false,
    sent,
    send: (message) => sent.push(message),
    onClose: (fn) => handlers.push(fn),
    close: () => {
      for (const fn of handlers.splice(0)) fn()
    },
    closeAll: () => {
      for (const fn of handlers.splice(0)) fn()
    },
  }
}

/** Writes a config with one profile per id, each with its own config dir inside `root`. */
export async function writeTestConfig(
  root: string,
  ids: string[] = ['claudin'],
  extra: Record<string, unknown> = {},
): Promise<{ id: string; configDir: string }[]> {
  const { mkdir, writeFile } = await import('node:fs/promises')
  const profiles = ids.map((id) => ({ id, name: id, configDir: join(root, `cfg-${id}`), color: '#fff' }))
  for (const p of profiles) await mkdir(join(p.configDir, 'projects'), { recursive: true })
  await mkdir(join(root, '.remote-harness'), { recursive: true })
  await writeFile(join(root, '.remote-harness', 'config.json'), JSON.stringify({ profiles, ...extra }))
  return profiles
}

export function hookEvent(
  event: import('../src/features/hooks/payloads.ts').HookEventName,
  payload: Record<string, unknown> & { session_id: string },
  extra: { paneId?: string | null; profileId?: string | null } = {},
): import('../src/features/hooks/payloads.ts').HookEvent {
  return {
    event,
    payload,
    paneId: extra.paneId ?? null,
    profileId: extra.profileId ?? 'claudin',
    receivedAt: new Date().toISOString(),
  }
}
