import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PROTOCOL_VERSION, type ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import WebSocket from 'ws'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { FileTokenStore } from '../src/core/secrets.ts'
import { type BrokerOptions, buildHookOutput, PermissionBroker } from '../src/features/permissions/broker.ts'
import { parseInteraction } from '../src/features/permissions/interaction.ts'

const DENY = 'Denied by Remote Harness'
const KEEP_PLANNING = 'Keep planning'

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
    expect(buildHookOutput({ behavior: 'allow' }, DENY)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    })
  })

  test('allow always maps scope to destination', () => {
    expect(
      buildHookOutput({ behavior: 'allow', always: { rule: 'Bash(pnpm test:*)', scope: 'project' } }, DENY),
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
    const profile = buildHookOutput(
      { behavior: 'allow', always: { rule: 'Edit', scope: 'profile' } },
      DENY,
    ) as {
      hookSpecificOutput: { decision: { updatedPermissions: { destination: string }[] } }
    }
    expect(profile.hookSpecificOutput.decision.updatedPermissions[0]?.destination).toBe('userSettings')
  })

  test('deny', () => {
    expect(buildHookOutput({ behavior: 'deny' }, DENY)).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: DENY },
      },
    })
  })
})

describe('PermissionBroker', () => {
  function setup(
    timeoutMs = 1_000,
    tool: { name: string; input: Record<string, unknown> } = {
      name: 'Bash',
      input: { command: 'pnpm test' },
    },
    extra: Partial<BrokerOptions> = {},
  ) {
    const sent: ServerMessage[] = []
    const rules: unknown[] = []
    const handovers: string[] = []
    const reminders: string[] = []
    const watching = new Map<string, () => void>()
    /** The session moves on (a tool result in the transcript, a turn hook). */
    const move = (sessionId = 's') => watching.get(sessionId)?.()
    const broker = new PermissionBroker(
      { broadcast: (m) => sent.push(m) },
      {
        timeoutMs,
        handoverGraceMs: 20,
        watch: (sessionId, onMove) => {
          watching.set(sessionId, onMove)
          return () => watching.delete(sessionId)
        },
        onHandover: (info, end) => handovers.push(`${info.tool}:${end}`),
        onReminder: (info) => reminders.push(info.tool),
        ...extra,
        defaultScope: 'project',
        profiles: [{ id: 'claudin', name: 'P', configDir: '/cfg', color: '' }],
        denyMessage: DENY,
        keepPlanningMessage: KEEP_PLANNING,
        onRuleCreated: (r) => rules.push(r),
      },
    )
    const hook = hookEvent('PermissionRequest', {
      session_id: 's',
      cwd: '/w',
      tool_name: tool.name,
      tool_input: tool.input,
    })
    const requestId = () =>
      (
        sent.find((m) => m.type === 'permission.request') as Extract<
          ServerMessage,
          { type: 'permission.request' }
        >
      ).request.requestId
    return { sent, broker, hook, requestId, rules, handovers, reminders, watching, move }
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  test('timeout returns no decision and hands the request over to the terminal', async () => {
    const { broker, hook, sent, requestId, handovers, move, watching } = setup(20)
    expect(await broker.handle(hook, new AbortController().signal)).toEqual({})
    expect(sent.at(-1)).toMatchObject({ type: 'permission.request', request: { terminal: true } })
    expect(sent.some((m) => m.type === 'permission.resolved')).toBe(false)
    expect(handovers).toEqual(['Bash:expired'])
    // Still waiting: queued prompts hold, late clients see it, the phone cannot answer it.
    expect(broker.hasPending('s')).toBe(true)
    expect(broker.list()).toMatchObject([{ terminal: true }])
    expect(() => broker.respond(requestId(), { behavior: 'allow' })).toThrow(
      expect.objectContaining({ code: 'already_resolved' }),
    )
    expect(broker.denyAll('s')).toBe(0)
    move()
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'expired' })
    expect(broker.hasPending('s')).toBe(false)
    expect(watching.size).toBe(0)
  })

  test('a question waits for its own, longer timeout', async () => {
    const { broker, hook, sent, requestId } = setup(20, QUESTION, { questionTimeoutMs: 1_000 })
    const pending = broker.handle(hook, new AbortController().signal)
    await sleep(60)
    expect(sent).toHaveLength(1)
    broker.answer(requestId(), { kind: 'question', answers: { 'Which database?': 'SQLite' } })
    expect(await pending).toMatchObject({ hookSpecificOutput: { decision: { behavior: 'allow' } } })
  })

  test('closed by Claude Code after an answer in the terminal: cancelled, never handed over', async () => {
    const { broker, hook, sent, move, handovers } = setup()
    const controller = new AbortController()
    const pending = broker.handle(hook, controller.signal)
    move()
    controller.abort()
    expect(await pending).toEqual({})
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'cancelled' })
    expect(handovers).toEqual([])
  })

  test('closed by Claude Code, transcript within the grace: cancelled without a handover', async () => {
    const { broker, hook, sent, move, handovers } = setup()
    const controller = new AbortController()
    const pending = broker.handle(hook, controller.signal)
    controller.abort()
    await pending
    move()
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'cancelled' })
    await sleep(40)
    expect(handovers).toEqual([])
    expect(sent.filter((m) => m.type === 'permission.request')).toHaveLength(1)
  })

  test('closed by Claude Code while the dialog stays open: handed over after the grace', async () => {
    const { broker, hook, sent, handovers } = setup()
    const controller = new AbortController()
    const pending = broker.handle(hook, controller.signal)
    controller.abort()
    await pending
    expect(broker.hasPending('s')).toBe(true)
    await sleep(40)
    expect(handovers).toEqual(['Bash:aborted'])
    expect(sent.at(-1)).toMatchObject({ type: 'permission.request', request: { terminal: true } })
    // A new request of the session means the agent went past the old dialog.
    void broker.handle(hook, new AbortController().signal)
    expect(sent.at(-2)).toMatchObject({ type: 'permission.resolved', outcome: 'cancelled' })
    expect(sent.at(-1)).toMatchObject({ type: 'permission.request' })
    expect(sent.at(-1)).not.toHaveProperty('request.terminal')
    broker.cancelAll('s')
  })

  test('a session that ends drops its handed-over requests', async () => {
    const { broker, hook, sent } = setup(20)
    await broker.handle(hook, new AbortController().signal)
    expect(broker.cancelAll('s')).toBe(1)
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'expired' })
  })

  test('shutdown releases hooks without handing them over', async () => {
    const { broker, hook, sent, handovers } = setup()
    const pending = broker.handle(hook, new AbortController().signal)
    broker.dispose()
    expect(await pending).toEqual({})
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'expired' })
    expect(handovers).toEqual([])
  })

  test('cancelAll drops the requests of a session that ended', async () => {
    const { broker, hook, sent } = setup()
    const pending = broker.handle(hook, new AbortController().signal)
    expect(broker.cancelAll('other')).toBe(0)
    expect(broker.cancelAll('s')).toBe(1)
    expect(await pending).toEqual({})
    expect(broker.hasPending('s')).toBe(false)
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

  test('a project rule approved in a worktree session is recorded in the main checkout', async () => {
    const { broker, requestId, rules } = setup()
    const hook = hookEvent('PermissionRequest', {
      session_id: 's',
      cwd: '/w/.claude/worktrees/login',
      tool_name: 'Bash',
      tool_input: { command: 'pnpm test' },
    })
    const pending = broker.handle(hook, new AbortController().signal)
    broker.respond(requestId(), {
      behavior: 'allow',
      always: { rule: 'Bash(pnpm test:*)', scope: 'project' },
    })
    await pending
    expect(rules).toMatchObject([{ file: '/w/.claude/settings.local.json' }])
  })

  const QUESTION = {
    name: 'AskUserQuestion',
    input: {
      questions: [
        {
          question: 'Which database?',
          header: 'DB',
          options: [{ label: 'Postgres', description: 'relational' }, { label: 'SQLite' }],
          multiSelect: false,
        },
      ],
    },
  }

  test('a question carries its options and is answered with updatedInput', async () => {
    const { broker, hook, sent, requestId } = setup(1_000, QUESTION)
    const pending = broker.handle(hook, new AbortController().signal)
    expect(sent[0]).toMatchObject({
      request: {
        interaction: {
          kind: 'question',
          questions: [{ question: 'Which database?', kind: 'choice', options: [{ label: 'Postgres' }, {}] }],
        },
      },
    })
    expect(() => broker.respond(requestId(), { behavior: 'allow' })).toThrow(
      expect.objectContaining({ code: 'bad_request' }),
    )
    expect(() => broker.answer(requestId(), { kind: 'plan', decision: 'default' })).toThrow(
      expect.objectContaining({ code: 'bad_request' }),
    )
    broker.answer(requestId(), {
      kind: 'question',
      answers: { 'Which database?': 'Postgres', 'Not asked': 'x' },
    })
    expect(await pending).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow',
          updatedInput: { ...QUESTION.input, answers: { 'Which database?': 'Postgres' } },
        },
      },
    })
    expect(sent.at(-1)).toMatchObject({ type: 'permission.resolved', outcome: 'allowed' })
  })

  test('a question can still be declined', async () => {
    const { broker, hook, requestId } = setup(1_000, QUESTION)
    const pending = broker.handle(hook, new AbortController().signal)
    broker.respond(requestId(), { behavior: 'deny' })
    expect(await pending).toMatchObject({ hookSpecificOutput: { decision: { behavior: 'deny' } } })
  })

  const PLAN = { name: 'ExitPlanMode', input: { plan: '1. do it', planFilePath: '/p.md' } }

  test('plan approval switches the session mode', async () => {
    const { broker, hook, sent, requestId } = setup(1_000, PLAN)
    const pending = broker.handle(hook, new AbortController().signal)
    expect(sent[0]).toMatchObject({ request: { interaction: { kind: 'plan', plan: '1. do it' } } })
    broker.answer(requestId(), { kind: 'plan', decision: 'acceptEdits' })
    expect(await pending).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow',
          updatedPermissions: [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }],
        },
      },
    })
  })

  test('keep planning denies with the feedback or the default message', async () => {
    for (const [feedback, message] of [
      ['split step 2', 'split step 2'],
      ['  ', KEEP_PLANNING],
    ] as const) {
      const { broker, hook, requestId } = setup(1_000, PLAN)
      const pending = broker.handle(hook, new AbortController().signal)
      broker.answer(requestId(), { kind: 'plan', decision: 'keepPlanning', feedback })
      expect(await pending).toMatchObject({ hookSpecificOutput: { decision: { behavior: 'deny', message } } })
    }
  })
})

describe('parseInteraction', () => {
  test('questions: defaults, text questions and the optional title', () => {
    expect(
      parseInteraction('AskUserQuestion', {
        title: 'Before I start',
        questions: [
          { question: 'Name?', kind: 'text' },
          { question: 'Tests?', options: [{ label: 'Unit' }, { label: 'E2E' }], multiSelect: true },
        ],
      }),
    ).toEqual({
      kind: 'question',
      title: 'Before I start',
      questions: [
        { question: 'Name?', header: null, kind: 'text', options: [], multiSelect: false },
        {
          question: 'Tests?',
          header: null,
          kind: 'choice',
          options: [
            { label: 'Unit', description: null },
            { label: 'E2E', description: null },
          ],
          multiSelect: true,
        },
      ],
    })
  })

  test('malformed or unrelated input has no interaction', () => {
    expect(parseInteraction('AskUserQuestion', {})).toBeNull()
    expect(parseInteraction('AskUserQuestion', { questions: [] })).toBeNull()
    expect(parseInteraction('AskUserQuestion', { questions: [{ question: 'Q', options: [] }] })).toBeNull()
    expect(parseInteraction('Bash', { command: 'ls' })).toBeNull()
    expect(parseInteraction('ExitPlanMode', {})).toEqual({ kind: 'plan', plan: null })
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
