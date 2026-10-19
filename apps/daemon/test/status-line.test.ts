import { execFile } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile, ServerMessage } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import {
  installStatusLine,
  installStatusLineScript,
  uninstallStatusLine,
} from '../src/features/hooks/installer.ts'
import type { SessionStore as Store } from '../src/features/sessions/store.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { parseStatusLine } from '../src/features/status-line/payload.ts'
import { StatusLineService } from '../src/features/status-line/service.ts'
import {
  isOurStatusLine,
  originalCommand,
  STATUS_LINE_ROUTE,
  statusLineCommand,
  unwrapStatusLine,
  wrapStatusLine,
} from '../src/features/status-line/wrapper.ts'
import { createHooksServer, SECRET_HEADER } from '../src/transport/hooks-server.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

const full = {
  session_id: 's1',
  transcript_path: '/cfg/projects/x/s1.jsonl',
  model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' },
  effort: { level: 'high' },
  context_window: {
    total_input_tokens: 124_000,
    total_output_tokens: 900,
    context_window_size: 200_000,
    used_percentage: 62,
    remaining_percentage: 38,
  },
  rate_limits: {
    five_hour: { used_percentage: 41, resets_at: 1_792_000_000 },
    seven_day: { used_percentage: 73, resets_at: 1_792_400_000 },
  },
}

describe('parseStatusLine', () => {
  test('reads model, effort, context and limits', () => {
    expect(parseStatusLine(full)).toEqual({
      sessionId: 's1',
      transcriptPath: '/cfg/projects/x/s1.jsonl',
      status: {
        model: 'Opus 5.5',
        effort: 'high',
        context: { usedTokens: 124_000, size: 200_000, percent: 62 },
      },
      limits: {
        fiveHour: { percent: 41, resetsAt: 1_792_000_000_000 },
        sevenDay: { percent: 73, resetsAt: 1_792_400_000_000 },
      },
    })
  })

  test('missing items are null, not zero', () => {
    const parsed = parseStatusLine({
      session_id: 's1',
      model: { id: 'claude-x' },
      context_window: { context_window_size: 200_000, used_percentage: null },
    })
    expect(parsed?.status).toEqual({ model: 'claude-x', effort: null, context: null })
    expect(parsed?.limits).toBeNull()
  })

  test('only one window, malformed blocks dropped', () => {
    const parsed = parseStatusLine({
      session_id: 's1',
      effort: 'high',
      rate_limits: { seven_day: { used_percentage: 10, resets_at: 5 }, five_hour: { used_percentage: 'x' } },
    })
    expect(parsed?.status).toBeNull()
    expect(parsed?.limits).toEqual({ fiveHour: null, sevenDay: { percent: 10, resetsAt: 5000 } })
  })

  test('estimates tokens when only the percentage is known', () => {
    const parsed = parseStatusLine({
      session_id: 's1',
      context_window: { context_window_size: 1_000_000, used_percentage: 12.5 },
    })
    expect(parsed?.status?.context).toEqual({ usedTokens: 125_000, size: 1_000_000, percent: 12.5 })
  })

  test('rejects payloads without a session', () => {
    expect(parseStatusLine({ model: {} })).toBeNull()
    expect(parseStatusLine('nope')).toBeNull()
  })
})

const script = '/home/me/.remote-harness/bin/remote-harness-statusline'

describe('status line settings', () => {
  test('wraps the user command and restores it', () => {
    const settings = { theme: 'dark', statusLine: { type: 'command', command: 'bash ~/s.sh', padding: 0 } }
    const wrapped = wrapStatusLine(settings, script)
    expect(wrapped.theme).toBe('dark')
    expect(wrapped.statusLine).toMatchObject({ type: 'command', padding: 0 })
    const command = (wrapped.statusLine as { command: string }).command
    expect(isOurStatusLine(command)).toBe(true)
    expect(originalCommand(command)).toBe('bash ~/s.sh')
    expect(wrapStatusLine(wrapped, script)).toEqual(wrapped)
    expect(unwrapStatusLine(wrapped)).toEqual(settings)
  })

  test('without a status line, uninstall removes ours', () => {
    const wrapped = wrapStatusLine({ theme: 'dark' }, script)
    expect(wrapped.statusLine).toEqual({ type: 'command', command: `'${script}'` })
    expect(unwrapStatusLine(wrapped)).toEqual({ theme: 'dark' })
  })

  test('commands with quotes survive the round trip', () => {
    const original = `printf '%s' "$(jq -r '.model.display_name')"`
    const command = statusLineCommand("/it's/remote-harness-statusline", original)
    expect(isOurStatusLine(command)).toBe(true)
    expect(originalCommand(command)).toBe(original)
  })

  test('re-wraps a command the user put back', () => {
    const wrapped = wrapStatusLine({ statusLine: { type: 'command', command: 'echo new' } }, script)
    expect(originalCommand((wrapped.statusLine as { command: string }).command)).toBe('echo new')
  })

  test('leaves other settings and foreign status lines alone', () => {
    expect(unwrapStatusLine({ statusLine: { type: 'command', command: 'echo hi' } })).toEqual({
      statusLine: { type: 'command', command: 'echo hi' },
    })
    const other = { statusLine: { type: 'static', text: 'x' } }
    expect(wrapStatusLine(other, script)).toBe(other)
  })
})

function run(file: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { env: { ...process.env, TMUX_PANE: '%7' } }, (error, stdout) =>
      error ? reject(error) : resolve(stdout),
    )
    child.stdin?.end(input)
  })
}

describe('status line script', () => {
  test('forwards the JSON and prints the original output', async () => {
    const received: Array<{ body: unknown; pane: unknown }> = []
    const app = createHooksServer({ secret: 'top secret', logger: silentLogger })
    app.post(STATUS_LINE_ROUTE, async (request, reply) => {
      received.push({ body: request.body, pane: request.headers['x-claude-remote-pane'] })
      return reply.code(204).send()
    })
    await app.listen({ host: '127.0.0.1', port: 0 })
    try {
      const address = app.server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const path = await installStatusLineScript(join(home.dir(), 'bin'), { port, secret: 'top secret' })
      expect((await stat(path)).mode & 0o777).toBe(0o700)
      const input = JSON.stringify(full)
      const command = statusLineCommand(path, `jq -r '"[" + .model.display_name + "]"'`)
      const output = await run('/bin/sh', ['-c', command], input)
      expect(output).toBe('[Opus 5.5]\n')
      expect(await run('/bin/sh', ['-c', statusLineCommand(path, null)], input)).toBe('')
      for (let i = 0; i < 50 && received.length < 2; i++) await new Promise((r) => setTimeout(r, 50))
      expect(received).toHaveLength(2)
      expect(received[0]).toEqual({ body: full, pane: '%7' })
    } finally {
      await app.close()
    }
  })

  test('keeps working when the daemon is down', async () => {
    const path = await installStatusLineScript(join(home.dir(), 'bin'), { port: 9, secret: 'x' })
    expect(await run('/bin/sh', ['-c', statusLineCommand(path, 'cat')], '{"a":1}')).toBe('{"a":1}')
  })

  test('installs into settings.json with a backup, idempotently, and uninstalls', async () => {
    const configDir = join(home.dir(), 'cfg')
    await mkdir(configDir, { recursive: true })
    const profile: Profile = { id: 'claudin', name: 'P', configDir, color: '#fff' }
    const settings = join(configDir, 'settings.json')
    const original = { statusLine: { type: 'command', command: 'echo hi' }, model: 'opus' }
    await writeFile(settings, JSON.stringify(original))
    expect(await installStatusLine(profile, script)).toBe(true)
    expect(await installStatusLine(profile, script)).toBe(false)
    expect(JSON.parse(await readFile(settings, 'utf8')).model).toBe('opus')
    expect(await uninstallStatusLine(profile)).toBe(true)
    expect(JSON.parse(await readFile(settings, 'utf8'))).toEqual(original)
  })
})

function record(id: string, profileId = 'claudin'): SessionRecord {
  return {
    id,
    profileId,
    cwd: '/tmp',
    title: 'x',
    state: 'idle',
    permissionMode: null,
    approvalPolicy: null,
    controllable: true,
    paneId: '%1',
    updatedAt: '2026-10-18T10:00:00.000Z',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
    transcriptPath: null,
  }
}

describe('StatusLineService', () => {
  const profiles: Profile[] = [{ id: 'claudin', name: 'P', configDir: '/cfg', color: '#fff' }]

  function setup() {
    const sent: ServerMessage[] = []
    const hub = { broadcast: (m: ServerMessage) => sent.push(m) }
    const store: Store = new SessionStore(hub, join(home.dir(), 's.json'), silentLogger, 60_000)
    const service = new StatusLineService(store, hub, profiles, silentLogger)
    return { sent, store, service }
  }

  test('sets the session status without bumping updatedAt', () => {
    const { store, service } = setup()
    const before = store.upsert('s1', {}, () => record('s1'))?.updatedAt
    expect(service.handle(full, null)).toBe(true)
    expect(store.get('s1')?.status?.model).toBe('Opus 5.5')
    expect(store.get('s1')?.updatedAt).toBe(before)
    store.dispose()
  })

  test('sends limits once per profile, by transcript path or header', () => {
    const { sent, store, service } = setup()
    service.handle(full, null)
    service.handle({ ...full, session_id: 's2' }, 'claudin')
    const limits = sent.filter((m) => m.type === 'limits.updated')
    expect(limits).toHaveLength(1)
    expect(service.current()).toHaveLength(1)
    service.handle({ ...full, rate_limits: { five_hour: { used_percentage: 50, resets_at: 1 } } }, null)
    expect(sent.filter((m) => m.type === 'limits.updated')).toHaveLength(2)
    store.dispose()
  })

  test('applies a status that arrived before the session', async () => {
    const { store, service } = setup()
    service.handle({ ...full, transcript_path: undefined }, null)
    store.upsert('s1', {}, () => record('s1'))
    await Promise.resolve()
    expect(store.get('s1')?.status?.effort).toBe('high')
    store.dispose()
  })

  test('rejects invalid bodies', () => {
    const { service, store } = setup()
    expect(service.handle({}, null)).toBe(false)
    store.dispose()
  })
})

describe('/statusline route', () => {
  test('requires the secret', async () => {
    const app = createHooksServer({ secret: 'k', logger: silentLogger })
    app.post(STATUS_LINE_ROUTE, async (_request, reply) => reply.code(204).send())
    expect((await app.inject({ method: 'POST', url: STATUS_LINE_ROUTE, payload: full })).statusCode).toBe(401)
    const ok = await app.inject({
      method: 'POST',
      url: STATUS_LINE_ROUTE,
      headers: { [SECRET_HEADER]: 'k' },
      payload: full,
    })
    expect(ok.statusCode).toBe(204)
  })
})
