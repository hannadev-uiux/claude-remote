import { readFile, writeFile } from 'node:fs/promises'
import type { PushMode } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { loadConfig, updateConfigFile } from '../src/core/config.ts'
import { messagesFor } from '../src/core/i18n/index.ts'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { DeviceRegistry, describeDevices, MAX_DEVICES } from '../src/features/push/devices.ts'
import { resolvePushMode, SwitchablePushSender } from '../src/features/push/mode.ts'
import {
  ANDROID_CHANNEL_ID,
  buildMulticast,
  type PushMessage,
  type PushSender,
} from '../src/features/push/sender.ts'
import { PERMISSION_CATEGORY, PushService } from '../src/features/push/service.ts'
import { hookEvent, useTempHome } from './helpers.ts'

useTempHome()

function fakeSender(invalid: string[] = []) {
  const sent: { tokens: readonly string[]; message: PushMessage }[] = []
  const sender: PushSender = {
    async send(targets, message) {
      sent.push({ tokens: targets.map((t) => t.token), message })
      return { invalidTokens: invalid }
    },
    async sendLive() {
      return { invalid: false }
    },
  }
  return { sender, sent }
}

const en = messagesFor('en-US').push

async function setup(
  opts: {
    foreground?: boolean
    muted?: boolean
    invalid?: string[]
    tokens?: string[]
    locale?: Parameters<typeof messagesFor>[0]
    mode?: PushMode
  } = {},
) {
  const devices = new DeviceRegistry(paths.devices())
  await devices.load()
  for (const t of opts.tokens ?? ['tok-1']) await devices.register(t)
  const { sender, sent } = fakeSender(opts.invalid)
  const service = new PushService(sender, devices, silentLogger, {
    profiles: [{ id: 'drclaude', name: 'DoctorX', configDir: '', color: '' }],
    hasForegroundClient: () => opts.foreground ?? false,
    isMuted: () => opts.muted ?? false,
    messages: messagesFor(opts.locale ?? 'en-US').push,
    mode: () => opts.mode ?? 'relay',
    host: 'mac',
  })
  return { service, sent, devices }
}

describe('DeviceRegistry', () => {
  test('keeps the newest tokens first and persists them', async () => {
    const devices = new DeviceRegistry(paths.devices())
    for (const t of ['a', 'b', 'c', 'd', 'b']) await devices.register(t)
    expect(devices.list()).toEqual(['b', 'd', 'c'].slice(0, MAX_DEVICES))
    const again = new DeviceRegistry(paths.devices())
    await again.load()
    expect(again.list()).toEqual(devices.list())
    expect(JSON.parse(await readFile(paths.devices(), 'utf8')).tokens).toHaveLength(3)
  })

  test('stores the platform and reads files written before it existed', async () => {
    const devices = new DeviceRegistry(paths.devices())
    await devices.register('legacy')
    await devices.register('pixel', 'android')
    await devices.register('iphone', 'ios')
    const again = new DeviceRegistry(paths.devices())
    await again.load()
    expect(again.devices().map((d) => [d.token, d.platform])).toEqual([
      ['iphone', 'ios'],
      ['pixel', 'android'],
      ['legacy', undefined],
    ])
    expect(again.list()).toEqual(['iphone', 'pixel', 'legacy'])
    expect(describeDevices(again.devices())).toBe('iOS, Android, iOS')
    expect(describeDevices([])).toBeNull()
  })
})

describe('buildMulticast', () => {
  test('carries an APNs block and a high-priority Android block on the app channel', () => {
    const payload = buildMulticast(['a', 'b'], {
      title: 'Permission pending',
      body: 'DoctorX',
      data: { sessionId: 's', requestId: 'r1' },
      category: PERMISSION_CATEGORY,
    })
    expect(payload).toEqual({
      tokens: ['a', 'b'],
      notification: { title: 'Permission pending', body: 'DoctorX' },
      data: { sessionId: 's', requestId: 'r1' },
      apns: { payload: { aps: { sound: 'default', category: PERMISSION_CATEGORY } } },
      android: { priority: 'high', notification: { channelId: ANDROID_CHANNEL_ID, sound: 'default' } },
    })
    expect(ANDROID_CHANNEL_ID).toBe('claude-remote')
  })

  test('omits the APNs category when there is none', () => {
    const payload = buildMulticast(['a'], { title: 't', body: 'b', data: {} })
    expect(payload.apns.payload.aps).toEqual({ sound: 'default' })
  })
})

describe('PushService', () => {
  test('Stop becomes a content-free push', async () => {
    const { service, sent } = await setup()
    const hook = hookEvent(
      'Stop',
      { session_id: 's', last_assistant_message: 'segredo' },
      { profileId: 'drclaude' },
    )
    expect(await service.notify(service.messageForHook(hook))).toBe(true)
    expect(sent[0]).toEqual({
      tokens: ['tok-1'],
      message: {
        title: 'Session finished',
        body: 'DoctorX',
        data: { sessionId: 's', profileId: 'drclaude', event: 'Stop' },
      },
    })
    expect(JSON.stringify(sent)).not.toContain('segredo')
  })

  test('permission requests carry the request id and action category, never the command', async () => {
    const { service, sent } = await setup()
    const message = service.messageForPermission({
      requestId: 'r1',
      sessionId: 's',
      profileId: 'drclaude',
      tool: 'Bash',
      input: { command: 'rm -rf /secret' },
      suggestedRule: null,
      defaultScope: 'project',
      createdAt: '',
      expiresAt: '',
    })
    await service.notify(message)
    expect(sent[0]?.message).toMatchObject({
      title: 'Permission pending',
      category: PERMISSION_CATEGORY,
      data: { requestId: 'r1' },
    })
    expect(JSON.stringify(sent)).not.toContain('secret')
  })

  test('questions and plans get their own title and no Allow/Deny actions', async () => {
    const { service } = await setup()
    const base = {
      requestId: 'r1',
      sessionId: 's',
      profileId: 'drclaude',
      tool: 'AskUserQuestion',
      input: {},
      suggestedRule: null,
      defaultScope: 'project' as const,
      createdAt: '',
      expiresAt: '',
    }
    const question = service.messageForPermission({
      ...base,
      interaction: { kind: 'question', title: null, questions: [] },
    })
    expect(question.title).toBe('Claude is waiting for your answer')
    expect(question.category).toBeUndefined()
    const plan = service.messageForPermission({ ...base, interaction: { kind: 'plan', plan: 'secret plan' } })
    expect(plan.title).toBe('Plan ready for review')
    expect(JSON.stringify(plan)).not.toContain('secret')
  })

  test('permission_prompt notifications are left to the permission flow', async () => {
    const { service } = await setup()
    expect(
      service.messageForHook(
        hookEvent('Notification', { session_id: 's', notification_type: 'permission_prompt' }),
      ),
    ).toBeNull()
    expect(
      service.messageForHook(
        hookEvent('Notification', { session_id: 's', notification_type: 'idle_prompt' }),
      ),
    ).toMatchObject({
      title: 'Session waiting for you',
    })
  })

  test('titles follow the configured language and carry only the profile', async () => {
    for (const [locale, title] of [
      ['pt-BR', 'Sessão concluída'],
      ['es-ES', 'Sesión terminada'],
    ] as const) {
      const { service } = await setup({ locale })
      const hook = hookEvent(
        'Stop',
        { session_id: 's', last_assistant_message: 'segredo' },
        { profileId: 'drclaude' },
      )
      const message = service.messageForHook(hook)
      expect(message).toMatchObject({ title, body: 'DoctorX' })
      expect(JSON.stringify(message)).not.toContain('segredo')
    }
  })

  test('suppressed in the foreground, when muted, or without a sender', async () => {
    const msg = { title: 't', body: 'b', data: { sessionId: 's', profileId: 'p' } }
    expect(await (await setup({ foreground: true })).service.notify(msg)).toBe(false)
    expect(await (await setup({ muted: true })).service.notify(msg)).toBe(false)
    const devices = new DeviceRegistry(paths.devices())
    const disabled = new PushService(null, devices, silentLogger, {
      profiles: [],
      hasForegroundClient: () => false,
      isMuted: () => false,
      messages: en,
      mode: () => 'off',
      host: 'mac',
    })
    expect(await disabled.notify(msg)).toBe(false)
  })

  test('keeps the relay grant the app sent with its token', async () => {
    const devices = new DeviceRegistry(paths.devices())
    await devices.register('tok', 'ios', { url: 'https://relay.example/r', grant: 'g' })
    const reloaded = new DeviceRegistry(paths.devices())
    await reloaded.load()
    expect(reloaded.devices()).toMatchObject([{ token: 'tok', relay: { grant: 'g' } }])
  })

  test('drops tokens FCM reports as invalid', async () => {
    const { service, devices } = await setup({ tokens: ['good', 'bad'], invalid: ['bad'] })
    await service.notify({ title: 't', body: 'b', data: { sessionId: 's', profileId: 'p' } })
    expect(devices.list()).toEqual(['good'])
  })
})

describe('integration: hook → push', () => {
  test('a Stop hook pushes to registered devices', async () => {
    const { startDaemon } = await import('../src/main.ts')
    const { FileTokenStore } = await import('../src/core/secrets.ts')
    const { SECRET_HEADER } = await import('../src/transport/hooks-server.ts')
    const { fakeExecutor, writeTestConfig } = await import('./helpers.ts')
    const root = paths.devices().replace(/\/\.remote-harness\/devices\.json$/, '')
    await writeTestConfig(root, ['claudin'], { language: 'en-US' })
    await new DeviceRegistry(paths.devices()).register('phone')
    const { sender, sent } = fakeSender()
    const daemon = await startDaemon({
      logger: silentLogger,
      exec: fakeExecutor(),
      tokenStore: new FileTokenStore(),
      dev: true,
      wsPort: 0,
      hookPort: 0,
      pushSender: sender,
    })
    try {
      const secret = (await readFile(paths.hookSecret(), 'utf8')).trim()
      await fetch(`http://127.0.0.1:${daemon.hookPort}/hooks/Stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [SECRET_HEADER]: secret },
        body: JSON.stringify({ session_id: 's', cwd: '/w' }),
      })
      const start = Date.now()
      while (sent.length === 0 && Date.now() - start < 2000) await new Promise((r) => setTimeout(r, 20))
      expect(sent[0]).toMatchObject({ tokens: ['phone'], message: { title: en.sessionDone } })
    } finally {
      await daemon.stop()
    }
  })
})

describe('integration: device.register', () => {
  test('stores the platform sent by the app', async () => {
    const { startDaemon } = await import('../src/main.ts')
    const { FileTokenStore } = await import('../src/core/secrets.ts')
    const { fakeExecutor, writeTestConfig } = await import('./helpers.ts')
    const { PROTOCOL_VERSION } = await import('@remote-harness/protocol')
    const { default: WebSocket } = await import('ws')
    const root = paths.devices().replace(/\/\.remote-harness\/devices\.json$/, '')
    await writeTestConfig(root, ['claudin'])
    const store = new FileTokenStore()
    await store.set('tok')
    const daemon = await startDaemon({
      logger: silentLogger,
      exec: fakeExecutor(),
      tokenStore: store,
      dev: true,
      wsPort: 0,
      hookPort: 0,
      pushSender: fakeSender().sender,
    })
    const ws = new WebSocket(`ws://127.0.0.1:${daemon.wsPort}`)
    try {
      const replies: { replyTo?: string }[] = []
      ws.on('message', (d) => replies.push(JSON.parse(d.toString())))
      await new Promise((r) => ws.once('open', r))
      ws.send(JSON.stringify({ type: 'auth', id: '1', token: 'tok', protocolVersion: PROTOCOL_VERSION }))
      ws.send(JSON.stringify({ type: 'device.register', id: '2', fcmToken: 'pixel', platform: 'android' }))
      const start = Date.now()
      while (!replies.some((r) => r.replyTo === '2') && Date.now() - start < 2000) {
        await new Promise((r) => setTimeout(r, 20))
      }
      const saved = JSON.parse(await readFile(paths.devices(), 'utf8'))
      expect(saved.tokens).toMatchObject([{ token: 'pixel', platform: 'android' }])
    } finally {
      ws.close()
      await daemon.stop()
    }
  })
})

describe('push mode', () => {
  test('off wins, then the service account, then the relay', () => {
    expect(resolvePushMode({ setting: 'off', hasServiceAccount: true })).toBe('off')
    expect(resolvePushMode({ setting: 'auto', hasServiceAccount: true })).toBe('firebase')
    expect(resolvePushMode({ setting: 'auto', hasServiceAccount: false })).toBe('relay')
  })

  test('the switchable sender stops and resumes without new holders', async () => {
    const { sender, sent } = fakeSender()
    const switchable = new SwitchablePushSender(sender, 'relay')
    const target = [{ token: 't' }]
    const message = { title: 't', body: 'b', data: {} }
    await switchable.send(target, message)
    switchable.set(sender, 'off')
    expect(switchable.mode).toBe('off')
    await switchable.send(target, message)
    expect(await switchable.sendLive({} as never)).toEqual({ invalid: false })
    switchable.set(sender, 'firebase')
    await switchable.send(target, message)
    expect(sent).toHaveLength(2)
    switchable.set(null, 'relay')
    expect(switchable.mode).toBe('off')
  })
})

describe('test push', () => {
  test('goes only to the asking phone, even in the foreground and muted', async () => {
    const { service, sent } = await setup({ tokens: ['a', 'b'], foreground: true, muted: true })
    expect(await service.sendTest('a')).toEqual({ result: 'sent', sent: 1 })
    expect(sent).toEqual([
      { tokens: ['a'], message: { title: en.testTitle, body: en.testBody('mac'), data: { event: 'test' } } },
    ])
  })

  test('every phone from the CLI', async () => {
    const { service, sent } = await setup({ tokens: ['a', 'b'] })
    expect(await service.sendTest()).toEqual({ result: 'sent', sent: 2 })
    expect(sent[0]?.tokens).toEqual(['b', 'a'])
  })

  test('off, unregistered and invalid tokens', async () => {
    expect((await (await setup({ mode: 'off' })).service.sendTest('tok-1')).result).toBe('off')
    expect((await (await setup()).service.sendTest('other')).result).toBe('unregistered')
    const { service, devices } = await setup({ invalid: ['tok-1'] })
    expect(await service.sendTest('tok-1')).toEqual({ result: 'failed', sent: 0 })
    expect(devices.list()).toEqual([])
  })
})

describe('updateConfigFile', () => {
  test('changes one key, keeps the rest and backs up', async () => {
    const path = paths.config()
    const original = {
      profiles: [{ id: 'a', name: 'A', configDir: '~/.claude', color: '#fff' }],
      wsPort: 9000,
    }
    await loadConfig(silentLogger)
    await writeFile(path, JSON.stringify(original))
    expect(await updateConfigFile({ push: 'off' })).toBe(true)
    expect(await updateConfigFile({ push: 'off' })).toBe(false)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ ...original, push: 'off' })
    expect(JSON.parse(await readFile(`${path}.bak-claude-remote`, 'utf8'))).toEqual(original)
    expect((await loadConfig(silentLogger)).push).toBe('off')
    await expect(updateConfigFile({ push: 'maybe' })).rejects.toThrow()
  })
})
