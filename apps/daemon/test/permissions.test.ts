import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PROTOCOL_VERSION, type ServerMessage } from '@claude-remote/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import WebSocket from 'ws'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { FileTokenStore } from '../src/core/secrets.ts'
import { buildHookOutput, DENY_MESSAGE, PermissionBroker } from '../src/features/permissions/broker.ts'
import { bashPrefixRule, parseRule, suggestRule } from '../src/features/permissions/rules.ts'
import { RulesLog } from '../src/features/permissions/rules-log.ts'
import { type RunningDaemon, startDaemon } from '../src/main.ts'
import { SECRET_HEADER } from '../src/transport/hooks-server.ts'
import { fakeExecutor, hookEvent, useTempHome, writeTestConfig } from './helpers.ts'

const home = useTempHome()

describe('rules', () => {
  test('parses and suggests rules', () => {
    expect(parseRule('Bash(pnpm test:*)')).toEqual({ toolName: 'Bash', ruleContent: 'pnpm test:*' })
    expect(parseRule('Edit')).toEqual({ toolName: 'Edit' })
    expect(parseRule('bad rule')).toBeNull()
    expect(bashPrefixRule('pnpm test --filter x')).toBe('Bash(pnpm test:*)')
    expect(bashPrefixRule('ls -la && rm x')).toBe('Bash(ls:*)')
    expect(bashPrefixRule('FOO=1 npm run lint')).toBe('Bash(npm run:*)')
    expect(suggestRule('Edit', { file_path: '/a' }, undefined)).toBe('Edit')
    expect(suggestRule('mcp__github__create_issue', {}, undefined)).toBe('mcp__github__create_issue')
    expect(suggestRule('WebFetch', { url: 'https://docs.x.dev/a' }, undefined)).toBe(
      'WebFetch(domain:docs.x.dev)',
    )
  })

  test('prefers Claude Code suggestions', () => {
    const suggestions = [
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'rm -rf node_modules' }],
        behavior: 'allow',
        destination: 'localSettings',
      },
    ]
    expect(suggestRule('Bash', { command: 'rm -rf node_modules' }, suggestions)).toBe(
      'Bash(rm -rf node_modules)',
    )
  })
})

describe('hook output', () => {
  test('allow', () => {
    expect(buildHookOutput({ behavior: 'allow' })).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    })
  })

  test('allow always maps scope to destination', () => {
    expect(
      buildHookOutput({ behavior: 'allow', always: { rule: 'Bash(pnpm test:*)', scope: 'project' } }),
    ).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow',
          updatedPermissions: [
            {
              type: 'addRules',
              rules: [{ toolName: 'Bash', ruleContent: 'pnpm test:*' }],
              behavior: 'allow',
              destination: 'localSettings',
            },
          ],
        },
      },
    })
    const profile = buildHookOutput({ behavior: 'allow', always: { rule: 'Edit', scope: 'profile' } }) as {
      hookSpecificOutput: { decision: { updatedPermissions: { destination: string }[] } }
    }
    expect(profile.hookSpecificOutput.decision.updatedPermissions[0]?.destination).toBe('userSettings')
  })

  test('deny', () => {
    expect(buildHookOutput({ behavior: 'deny' })).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: DENY_MESSAGE },
      },
    })
  })
})

describe('PermissionBroker', () => {
  function setup(timeoutMs = 1_000) {
    const sent: ServerMessage[] = []
    const rules: unknown[] = []
    const broker = new PermissionBroker(
      { broadcast: (m) => sent.push(m) },
      {
        timeoutMs,
        defaultScope: 'project',
        profiles: [{ id: 'claudin', name: 'P', configDir: '/cfg', color: '' }],
        onRuleCreated: (r) => rules.push(r),
      },
    )
    const hook = hookEvent('PermissionRequest', {
      session_id: 's',
      cwd: '/w',
      tool_name: 'Bash',
      tool_input: { command: 'pnpm test' },
    })
    const requestId = () =>
      (
        sent.find((m) => m.type === 'permission.request') as Extract<
          ServerMessage,
          { type: 'permission.request' }
        >
      ).request.requestId
    return { sent, broker, hook, requestId, rules }
  }

  test('allow resolves the hook and notifies clients', async () => {
    const { broker, hook, sent, requestId } = setup()
    const pending = broker.handle(hook, new AbortController().signal)
    expect(broker.hasPending('s')).toBe(true)
    expect(sent[0]).toMatchObject({
      type: 'permission.request',
      request: { tool: 'Bash', suggestedRule: 'Bash(pnpm test:*)', defaultScope: 'project' },
    })
    broker.respond(requestId(), { behavior: 'allow' })
    expect(await pending).toMatchObject({ hookSpecificOutput: { decision: { behavior: 'allow' } } })
    expect(sent[1]).toMatchObject({ type: 'permission.resolved', outcome: 'allowed' })
    expect(broker.hasPending('s')).toBe(false)
  })

  test('second answer is rejected', async () => {
    const { broker, hook, requestId } = setup()
    const pending = broker.handle(hook, new AbortController().signal)
    broker.respond(requestId(), { behavior: 'deny' })
    expect(() => broker.respond(requestId(), { behavior: 'allow' })).toThrow(
      expect.objectContaining({ code: 'already_resolved' }),
    )
    expect(await pending).toMatchObject({ hookSpecificOutput: { decision: { behavior: 'deny' } } })
  })

  test('timeout returns no decision', async () => {
    const { broker, hook, sent } = setup(20)
    expect(await broker.handle(hook, new AbortController().signal)).toEqual({})
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'expired' })
  })

  test('cancelled when Claude Code drops the request', async () => {
    const { broker, hook, sent } = setup()
    const controller = new AbortController()
    const pending = broker.handle(hook, controller.signal)
    controller.abort()
    expect(await pending).toEqual({})
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'cancelled' })
  })

  test('always records the project settings file', async () => {
    const { broker, hook, requestId, rules } = setup()
    const pending = broker.handle(hook, new AbortController().signal)
    broker.respond(requestId(), {
      behavior: 'allow',
      always: { rule: 'Bash(pnpm test:*)', scope: 'project' },
    })
    await pending
    expect(rules).toEqual([
      { rule: 'Bash(pnpm test:*)', scope: 'project', file: '/w/.claude/settings.local.json', sessionId: 's' },
    ])
  })
})

describe('RulesLog', () => {
  test('lists and undoes rules, keeping the rest of the file', async () => {
    const file = join(home.dir(), 'proj', '.claude', 'settings.local.json')
    await mkdir(join(home.dir(), 'proj', '.claude'), { recursive: true })
    await writeFile(
      file,
      JSON.stringify({ env: { A: '1' }, permissions: { allow: ['Read', 'Bash(pnpm test:*)'] } }),
    )
    const log = new RulesLog(paths.rulesLog())
    const entry = await log.add({ rule: 'Bash(pnpm test:*)', scope: 'project', file, sessionId: 's' })
    expect((await log.list()).map((e) => e.id)).toEqual([entry.id])
    expect(await log.undo(entry.id)).toMatchObject({ removed: true })
    const { readFile } = await import('node:fs/promises')
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      env: { A: '1' },
      permissions: { allow: ['Read'] },
    })
    expect(await log.undo('missing')).toBeNull()
  })
})

describe('integration: hook HTTP + WebSocket', () => {
  let daemon: RunningDaemon | undefined
  afterEach(async () => {
    await daemon?.stop()
  })

  test('phone approves a pending hook', async () => {
    await writeTestConfig(home.dir())
    const store = new FileTokenStore()
    await store.set('tok')
    daemon = await startDaemon({
      logger: silentLogger,
      exec: fakeExecutor(),
      tokenStore: store,
      dev: true,
      wsPort: 0,
      hookPort: 0,
    })
    const ws = new WebSocket(`ws://127.0.0.1:${daemon.wsPort}`)
    const messages: ServerMessage[] = []
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())))
    await new Promise((r) => ws.once('open', r))
    ws.send(JSON.stringify({ type: 'auth', id: '1', token: 'tok', protocolVersion: PROTOCOL_VERSION }))

    const { readFile } = await import('node:fs/promises')
    const secret = (await readFile(paths.hookSecret(), 'utf8')).trim()
    const hookResponse = fetch(`http://127.0.0.1:${daemon.hookPort}/hooks/PermissionRequest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SECRET_HEADER]: secret },
      body: JSON.stringify({ session_id: 's', cwd: '/w', tool_name: 'Bash', tool_input: { command: 'ls' } }),
    })
    const deadline = Date.now() + 3000
    let request: Extract<ServerMessage, { type: 'permission.request' }> | undefined
    while (!request && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 20))
      request = messages.find(
        (m): m is Extract<ServerMessage, { type: 'permission.request' }> => m.type === 'permission.request',
      )
    }
    expect(request).toBeDefined()
    ws.send(
      JSON.stringify({
        type: 'permission.respond',
        id: '2',
        requestId: request!.request.requestId,
        decision: 'allow',
      }),
    )
    const body = await (await hookResponse).json()
    expect(body).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    })
    ws.close()
  })
})
