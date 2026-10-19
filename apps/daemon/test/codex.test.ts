import { execFile, execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PermissionRequestInfo, Profile, ServerMessage } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { EventBus } from '../src/core/event-bus.ts'
import type { DaemonEvents } from '../src/core/events.ts'
import { messagesFor } from '../src/core/i18n/index.ts'
import { KeyedMutex } from '../src/core/keyed-mutex.ts'
import { silentLogger } from '../src/core/logger.ts'
import { hasOurHooks, installHooks, settingsPath, uninstallHooks } from '../src/features/hooks/installer.ts'
import { renderLauncher } from '../src/features/hooks/launcher.ts'
import { HookReceiver } from '../src/features/hooks/receiver.ts'
import {
  buildCodexHookEntry,
  CODEX_HOOK_EVENTS,
  isOurHook,
  mergeOurHooks,
  removeOurHooks,
} from '../src/features/hooks/settings-hooks.ts'
import { InputService } from '../src/features/input/service.ts'
import { ModeService } from '../src/features/mode/service.ts'
import { PermissionBroker } from '../src/features/permissions/broker.ts'
import { SessionService } from '../src/features/sessions/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { detectConfigDirs, suggestProfile, validateAlias } from '../src/features/setup/profiles.ts'
import { TmuxClient } from '../src/infra/tmux.ts'
import { createHooksServer } from '../src/transport/hooks-server.ts'
import { fakeExecutor, hookEvent, useTempHome } from './helpers.ts'

const home = useTempHome()
const options = { port: 7338, secret: 's3cr3t', permissionTimeoutSec: 300 }
const userStop = { hooks: [{ type: 'command', command: 'say done' }] }

describe('codex hooks.json', () => {
  test('one command hook per Codex event, next to user hooks, idempotent and removable', () => {
    const once = mergeOurHooks({ hooks: { Stop: [userStop] } }, options, 'codex-hooks')
    expect(mergeOurHooks(once, options, 'codex-hooks')).toEqual(once)
    expect(Object.keys(once.hooks).sort()).toEqual([...CODEX_HOOK_EVENTS].sort())
    expect(once.hooks.Stop?.[0]).toEqual(userStop)
    for (const event of CODEX_HOOK_EVENTS) {
      const entry = once.hooks[event]?.at(-1)?.hooks[0]
      expect(entry?.type).toBe('command')
      expect(entry && isOurHook(entry)).toBe(true)
    }
    expect(removeOurHooks(once)).toEqual({ hooks: { Stop: [userStop] } })
  })

  test('the permission hook prints the answer; SessionEnd stays within 3 s', () => {
    const permission = buildCodexHookEntry('PermissionRequest', options)
    expect(permission.command).not.toContain('-o /dev/null')
    expect(permission.command).not.toContain(' >/dev/null')
    expect(permission.command).toContain('-m 300')
    expect(permission.timeout).toBe(310)
    const end = buildCodexHookEntry('SessionEnd', options)
    expect(end.timeout).toBe(3)
    expect(end.command).toContain('-m 2 ')
  })

  test('install writes hooks.json in CODEX_HOME with a backup; doctor sees it', async () => {
    const configDir = join(home.dir(), '.codex')
    await mkdir(configDir, { recursive: true })
    const profile: Profile = { id: 'cdx', name: 'Codex', configDir, color: '', agent: 'codex' }
    const path = join(configDir, 'hooks.json')
    expect(settingsPath(profile)).toBe(path)
    expect(await hasOurHooks(profile)).toBe(false)
    await writeFile(path, JSON.stringify({ hooks: { Stop: [userStop] } }))
    expect(await installHooks(profile, options)).toBe(true)
    expect(await installHooks(profile, options)).toBe(false)
    expect(await hasOurHooks(profile)).toBe(true)
    await uninstallHooks(profile)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ hooks: { Stop: [userStop] } })
    expect(await hasOurHooks(profile)).toBe(false)
  })

  test('the permission command posts stdin and prints the daemon decision', async () => {
    const profiles: Profile[] = [
      { id: 'cdx', name: 'C', configDir: '/Users/u/.codex', color: '', agent: 'codex' },
    ]
    const bus = new EventBus<DaemonEvents>()
    const app = createHooksServer({ secret: 'sec', logger: silentLogger })
    const receiver = new HookReceiver(bus, profiles, silentLogger)
    receiver.register(app)
    const answer = {
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    }
    let seen: { pane: string | null; profile: string | null; tool: unknown } | null = null
    receiver.setResponder('PermissionRequest', async (hook) => {
      seen = { pane: hook.paneId, profile: hook.profileId, tool: hook.payload.tool_name }
      return answer
    })
    await app.listen({ host: '127.0.0.1', port: 0 })
    try {
      const address = app.server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const entry = buildCodexHookEntry('PermissionRequest', {
        port,
        secret: 'sec',
        permissionTimeoutSec: 30,
      })
      const stdout = await new Promise<string>((resolve, reject) => {
        const child = execFile(
          'sh',
          ['-c', String(entry.command)],
          { env: { PATH: process.env.PATH, TMUX_PANE: '%9', CLAUDE_REMOTE_PROFILE: 'cdx' } },
          (error, out) => (error ? reject(error) : resolve(out)),
        )
        child.stdin?.end(
          JSON.stringify({
            session_id: '0199fd2a',
            hook_event_name: 'PermissionRequest',
            tool_name: 'Bash',
            tool_input: { command: 'rm -rf build' },
          }),
        )
      })
      expect(JSON.parse(stdout)).toEqual(answer)
      expect(seen).toEqual({ pane: '%9', profile: 'cdx', tool: 'Bash' })
    } finally {
      await app.close()
    }
  })

  test('the permission command prints nothing when the daemon is down', async () => {
    const entry = buildCodexHookEntry('PermissionRequest', { port: 9, secret: 'x', permissionTimeoutSec: 2 })
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        'sh',
        ['-c', String(entry.command)],
        { env: { PATH: process.env.PATH } },
        (e, out) => (e ? reject(e) : resolve(out)),
      )
      child.stdin?.end('{}')
    })
    expect(stdout).toBe('')
  })
})

describe('codex launcher', () => {
  const tmux = { tmuxSession: 's', tmuxBin: 'tmux', home: '/Users/u' }

  test('exports CODEX_HOME and runs codex, never a provider block', () => {
    const script = renderLauncher(
      {
        id: 'cdx',
        name: 'Codex',
        configDir: '/Users/u/.codex-work',
        color: '',
        agent: 'codex',
        provider: { kind: 'openrouter' },
      },
      tmux,
    )
    execFileSync('zsh', ['-n', '-c', script])
    expect(script).toContain("export CODEX_HOME='/Users/u/.codex-work'")
    expect(script).toMatch(/^CODEX_BIN=\$\{CLAUDE_REMOTE_CODEX_BIN:-codex\}$/m)
    expect(script).toContain('cmd=("$CODEX_BIN" "$@")')
    expect(script).toContain('-e "CODEX_HOME=$CODEX_HOME"')
    expect(script).not.toContain('CLAUDE_CONFIG_DIR')
    expect(script).not.toContain('read_provider_key')
  })

  test('the default ~/.codex runs with CODEX_HOME unset', () => {
    const script = renderLauncher(
      { id: 'cdx', name: 'C', configDir: '/Users/u/.codex', color: '', agent: 'codex' },
      tmux,
    )
    expect(script).toContain('unset CODEX_HOME')
    expect(script).toContain('cmd=(env -u CODEX_HOME "$CODEX_BIN" "$@")')
  })
})

describe('codex setup', () => {
  test('detects ~/.codex once Codex used it and suggests a Codex profile', async () => {
    const dir = home.dir()
    await mkdir(join(dir, '.claude'), { recursive: true })
    await mkdir(join(dir, '.codex'), { recursive: true })
    expect(await detectConfigDirs(dir)).toEqual(['~/.claude'])
    await writeFile(join(dir, '.codex', 'config.toml'), 'model = "x"\n')
    expect(await detectConfigDirs(dir)).toEqual(['~/.claude', '~/.codex'])
    expect(suggestProfile('~/.codex', [], 1, messagesFor('en-US').profiles)).toEqual({
      id: 'cdx',
      name: 'Codex',
      configDir: '~/.codex',
      color: '#2FBF8F',
      agent: 'codex',
    })
    expect(suggestProfile('~/.codex-work', [], 2, messagesFor('en-US').profiles)).toMatchObject({
      id: 'cdx-work',
      agent: 'codex',
    })
    expect(validateAlias('codex', [], messagesFor('en-US').profiles)).not.toBe(true)
  })
})

function codexSession(): SessionRecord {
  return {
    id: '0199fd2a',
    profileId: 'cdx',
    agent: 'codex',
    cwd: '/w',
    title: 't',
    state: 'idle',
    permissionMode: null,
    approvalPolicy: 'on-request',
    controllable: true,
    paneId: '%7',
    updatedAt: '',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
    transcriptPath: null,
  }
}

function storeWith(record: SessionRecord): SessionStore {
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  store.upsert(record.id, {}, () => record)
  store.dispose()
  return store
}

describe('codex input and mode', () => {
  function input(strategy: 'paste' | 'type') {
    const exec = fakeExecutor()
    const sleeps: number[] = []
    const service = new InputService(new TmuxClient(exec), storeWith(codexSession()), new KeyedMutex(), {
      strategy,
      pasteEnterDelayMs: 80,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })
    return { exec, service, sleeps }
  }

  test('Enter waits long enough for Codex not to take it as part of the paste', async () => {
    const { exec, service, sleeps } = input('paste')
    await service.sendText('0199fd2a', 'continue')
    expect(exec.calls.map((c) => c.args[0])).toEqual(['load-buffer', 'paste-buffer', 'send-keys'])
    expect(sleeps).toEqual([250])
  })

  test('typing uses C-j for new lines and no stray Escape', async () => {
    const { exec, service } = input('type')
    await service.sendText('0199fd2a', 'a\nb')
    expect(exec.calls.map((c) => c.args.slice(3))).toEqual([
      ['-l', '--', 'a'],
      ['C-j'],
      ['-l', '--', 'b'],
      ['Enter'],
    ])
  })

  test('modes cannot be changed from the app', async () => {
    const service = new ModeService(
      new TmuxClient(fakeExecutor()),
      storeWith(codexSession()),
      new KeyedMutex(),
      () => false,
    )
    await expect(service.setMode('0199fd2a', 'plan')).rejects.toMatchObject({ code: 'bad_request' })
  })
})

describe('codex permissions', () => {
  function broker() {
    const sent: ServerMessage[] = []
    const broker = new PermissionBroker(
      { broadcast: (m) => sent.push(m) },
      {
        timeoutMs: 5_000,
        defaultScope: 'project',
        profiles: [{ id: 'cdx', name: 'C', configDir: '/cfg', color: '', agent: 'codex' }],
        denyMessage: 'Denied from the phone',
        keepPlanningMessage: 'keep planning',
      },
    )
    const hook = hookEvent(
      'PermissionRequest',
      { session_id: '0199fd2a', cwd: '/w', tool_name: 'Bash', tool_input: { command: 'rm -rf build' } },
      { profileId: 'cdx' },
    )
    const request = () =>
      sent.flatMap((m) => (m.type === 'permission.request' ? [m.request] : []))[0] as PermissionRequestInfo
    return { broker, hook, request }
  }

  test('Allow / Deny only: no suggested rule, no rules in the answer', async () => {
    const { broker: b, hook, request } = broker()
    const answer = b.handle(hook, new AbortController().signal)
    await Promise.resolve()
    const info = request()
    expect(info).toMatchObject({ tool: 'Bash', suggestedRule: null })
    expect(() =>
      b.respond(info.requestId, { behavior: 'allow', always: { rule: 'Bash(rm:*)', scope: 'project' } }),
    ).toThrow(/does not take permission rules/)
    b.respond(info.requestId, { behavior: 'allow' })
    expect(await answer).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    })
  })

  test('deny carries the message', async () => {
    const { broker: b, hook, request } = broker()
    const answer = b.handle(hook, new AbortController().signal)
    await Promise.resolve()
    b.respond(request().requestId, { behavior: 'deny' })
    expect(await answer).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: 'Denied from the phone' },
      },
    })
  })
})

describe('codex sessions', () => {
  test('SessionStart links the pane, takes title and policy from the rollout, ignores permission_mode', async () => {
    const configDir = join(home.dir(), '.codex')
    await mkdir(configDir, { recursive: true })
    const rollout = join(configDir, 'rollout.jsonl')
    await writeFile(
      rollout,
      await readFile(join(import.meta.dirname, 'fixtures', 'codex-paginated.jsonl'), 'utf8'),
    )
    const store = new SessionStore(
      { broadcast: () => {} },
      join(home.dir(), 'state.json'),
      silentLogger,
      60_000,
    )
    const profiles: Profile[] = [{ id: 'cdx', name: 'Codex', configDir, color: '', agent: 'codex' }]
    const service = new SessionService(store, new TmuxClient(fakeExecutor()), profiles, silentLogger, {
      recentDays: 7,
      scanCacheMs: 0,
    })
    try {
      await service.handleHook(
        hookEvent(
          'SessionStart',
          {
            session_id: 'abc',
            cwd: '/Users/me/proj',
            transcript_path: rollout,
            permission_mode: 'bypassPermissions',
          },
          { paneId: '%4', profileId: 'cdx' },
        ),
      )
      expect(store.get('abc')).toMatchObject({
        agent: 'codex',
        controllable: true,
        paneId: '%4',
        title: 'run the tests',
        approvalPolicy: 'never',
        permissionMode: null,
        state: 'idle',
      })
      await service.handleHook(
        hookEvent('UserPromptSubmit', { session_id: 'abc', prompt: 'go' }, { profileId: 'cdx' }),
      )
      expect(store.get('abc')?.state).toBe('running')
      await service.handleHook(hookEvent('Stop', { session_id: 'abc' }, { profileId: 'cdx' }))
      expect(store.get('abc')?.state).toBe('idle')
    } finally {
      store.dispose()
    }
  })
})
