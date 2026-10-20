import { execFileSync, spawnSync } from 'node:child_process'
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { providerKeyStore } from '../src/core/secrets.ts'
import { renderLauncher } from '../src/features/hooks/launcher.ts'
import { checkProviderKey } from '../src/features/providers/key-check.ts'
import { parseCredits, parseModels, perMillion, providerEnv } from '../src/features/providers/openrouter.ts'
import { MODELS_TTL_MS, type ProviderFetch, ProviderService } from '../src/features/providers/service.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

const work: Profile = {
  id: 'work',
  name: 'Work',
  configDir: '/Users/u/.claude-work',
  color: '',
  provider: { kind: 'openrouter', model: 'anthropic/claude-sonnet-5.5' },
}
const personal: Profile = { id: 'personal', name: 'P', configDir: '/Users/u/.claude', color: '' }

const catalog = {
  data: [
    {
      id: 'openai/gpt-5.1',
      name: 'OpenAI: GPT-5.1',
      context_length: 400000,
      pricing: { prompt: '0.00000125', completion: '0.00001' },
      supported_parameters: ['temperature'],
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
    },
    {
      id: 'anthropic/claude-sonnet-5.5',
      name: ' Anthropic: Claude Sonnet 5.5 ',
      context_length: 200000,
      pricing: { prompt: '0.000003', completion: '0.000015', input_cache_read: '0.0000003' },
      supported_parameters: ['tools', 'reasoning'],
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    },
    {
      id: 'some/image-model',
      context_length: 1000,
      pricing: {},
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    },
    { id: 'bare/model' },
    { bogus: true },
  ],
}

type Route = { ok: boolean; status: number; body?: unknown }
type Call = { url: string; headers: Record<string, string> }

function fakeFetch(routes: Record<string, () => Route>): ProviderFetch & { calls: Call[] } {
  const calls: Call[] = []
  const impl = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} })
    const route = routes[url]
    if (!route) throw new Error(`ECONNREFUSED ${url}`)
    const reply = route()
    return { ok: reply.ok, status: reply.status, json: async () => reply.body }
  }) as ProviderFetch & { calls: Call[] }
  impl.calls = calls
  return impl
}

function service(fetchImpl: ProviderFetch, key: string | null, now = () => Date.now()) {
  return new ProviderService({
    profiles: [work, personal],
    fetch: fetchImpl,
    key: async () => key,
    cachePath: join(home.dir(), 'models-cache.json'),
    logger: silentLogger,
    now,
  })
}

describe('OpenRouter parsing', () => {
  test('models: text in/out only, prices per million, capability flags, sorted by id', () => {
    const models = parseModels(catalog)
    expect(models.map((m) => m.id)).toEqual(['anthropic/claude-sonnet-5.5', 'bare/model', 'openai/gpt-5.1'])
    expect(models[0]).toEqual({
      id: 'anthropic/claude-sonnet-5.5',
      name: 'Anthropic: Claude Sonnet 5.5',
      contextLength: 200000,
      promptPrice: 3,
      completionPrice: 15,
      tools: true,
      reasoning: true,
      caching: true,
    })
    expect(models[2]).toMatchObject({ promptPrice: 1.25, completionPrice: 10, tools: false, caching: false })
    expect(models[1]).toMatchObject({ name: 'bare/model', contextLength: null, promptPrice: null })
    expect(() => parseModels({ nope: [] })).toThrow(/unexpected/)
  })

  test('prices and credits', () => {
    expect(perMillion('0.000003')).toBe(3)
    expect(perMillion(0.0000003)).toBe(0.3)
    expect(perMillion('-1')).toBeNull()
    expect(perMillion(undefined)).toBeNull()
    expect(parseCredits({ data: { total_credits: 50, total_usage: 7.9 } })).toEqual({ total: 50, used: 7.9 })
    expect(parseCredits({ data: {} })).toBeNull()
  })

  test('environment for Claude Code: base URL (default, trailing slash trimmed) and the models', () => {
    expect(providerEnv({ kind: 'openrouter' })).toEqual({ ANTHROPIC_BASE_URL: 'https://openrouter.ai/api' })
    expect(
      providerEnv({
        kind: 'openrouter',
        baseUrl: 'https://gateway.example/api/',
        model: 'a/b',
        smallFastModel: 'a/c',
      }),
    ).toEqual({
      ANTHROPIC_BASE_URL: 'https://gateway.example/api',
      ANTHROPIC_MODEL: 'a/b',
      ANTHROPIC_SMALL_FAST_MODEL: 'a/c',
    })
  })
})

describe('ProviderService', () => {
  const modelsUrl = 'https://openrouter.ai/api/v1/models'
  const creditsUrl = 'https://openrouter.ai/api/v1/credits'

  test('fetches once per hour, persists the catalog and serves it stale when the provider is down', async () => {
    let now = Date.parse('2026-10-18T12:00:00Z')
    const fetchImpl = fakeFetch({ [modelsUrl]: () => ({ ok: true, status: 200, body: catalog }) })
    const first = service(fetchImpl, null, () => now)
    const fresh = await first.models('work')
    expect(fresh).toMatchObject({ profileId: 'work', stale: false, fetchedAt: '2026-10-18T12:00:00.000Z' })
    expect(fresh.models).toHaveLength(3)
    await first.models('work')
    expect(fetchImpl.calls).toHaveLength(1)
    expect(JSON.parse(await readFile(join(home.dir(), 'models-cache.json'), 'utf8')).entries).toHaveLength(1)

    now += MODELS_TTL_MS + 1
    const offline = service(fakeFetch({}), null, () => now)
    const stale = await offline.models('work')
    expect(stale).toMatchObject({ stale: true, fetchedAt: '2026-10-18T12:00:00.000Z' })
    expect(stale.models.map((m) => m.id)).toEqual(fresh.models.map((m) => m.id))
  })

  test('without a cache a failed fetch is an error; profiles without a provider are rejected', async () => {
    const down = service(fakeFetch({ [modelsUrl]: () => ({ ok: false, status: 503 }) }), null)
    await expect(down.models('work')).rejects.toMatchObject({ code: 'internal' })
    await expect(down.models('personal')).rejects.toMatchObject({ code: 'bad_request' })
    await expect(down.models('nope')).rejects.toMatchObject({ code: 'not_found' })
  })

  test('status: no key means no call; with a key the credits come with a bearer header', async () => {
    const fetchImpl = fakeFetch({
      [creditsUrl]: () => ({
        ok: true,
        status: 200,
        body: { data: { total_credits: 50, total_usage: 7.9 } },
      }),
    })
    expect(await service(fetchImpl, null).status('work')).toEqual({
      profileId: 'work',
      hasKey: false,
      credits: null,
    })
    expect(fetchImpl.calls).toHaveLength(0)
    expect(await service(fetchImpl, 'sk-or-v1-abc').status('work')).toEqual({
      profileId: 'work',
      hasKey: true,
      credits: { total: 50, used: 7.9 },
    })
    expect(fetchImpl.calls[0]?.headers.Authorization).toBe('Bearer sk-or-v1-abc')
    const unauthorized = service(fakeFetch({ [creditsUrl]: () => ({ ok: false, status: 401 }) }), 'bad')
    expect(await unauthorized.status('work')).toEqual({ profileId: 'work', hasKey: true, credits: null })
  })
})

describe('provider key store (file backend)', () => {
  test('writes a 0600 file in a 0700 secrets folder and reads it back', async () => {
    const store = providerKeyStore('file', fakeExecutor(), 'work')
    expect(await store.get()).toBeNull()
    await store.set('sk-or-v1-abc')
    expect(await store.get()).toBe('sk-or-v1-abc')
    const file = paths.providerKey('work')
    expect(file.endsWith('/secrets/provider-work')).toBe(true)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    expect((await stat(join(file, '..'))).mode & 0o777).toBe(0o700)
  })

  test('removes a stored key, and removing a missing one is not an error', async () => {
    const store = providerKeyStore('file', fakeExecutor(), 'work')
    await store.set('sk-or-v1-abc')
    await store.delete()
    expect(await store.get()).toBeNull()
    await expect(store.delete()).resolves.toBeUndefined()
  })

  test('Keychain and Secret Service removal ignore a missing key', async () => {
    const keychain = fakeExecutor(() => ({ exitCode: 44, stderr: 'could not be found' }))
    await providerKeyStore('keychain', keychain, 'work').delete()
    expect(keychain.calls[0]?.args).toEqual([
      'delete-generic-password',
      '-s',
      'claude-remote',
      '-a',
      'provider-work',
    ])
    const secretTool = fakeExecutor()
    await providerKeyStore('secret-tool', secretTool, 'work').delete()
    expect(secretTool.calls[0]?.args).toEqual([
      'clear',
      'service',
      'claude-remote',
      'account',
      'provider-work',
    ])
    const locked = fakeExecutor(() => ({ exitCode: 1, stderr: 'locked' }))
    await expect(providerKeyStore('secret-tool', locked, 'work').delete()).rejects.toThrow('locked')
  })
})

describe('provider key check', () => {
  const responder = (
    answers: Record<string, number | Error>,
    body: unknown = {},
  ): ProviderFetch & { urls: string[] } => {
    const urls: string[] = []
    const fetch = (async (url: string, init?: { headers?: Record<string, string> }) => {
      urls.push(url)
      expect(init?.headers?.Authorization).toBe('Bearer sk-or-v1-abc')
      const answer = answers[url.replace('https://openrouter.ai/api', '')]
      if (answer instanceof Error) throw answer
      const status = answer ?? 404
      return { ok: status === 200, status, json: async () => body }
    }) as ProviderFetch & { urls: string[] }
    fetch.urls = urls
    return fetch
  }

  test('a management key is valid with the credits', async () => {
    const fetch = responder({ '/v1/credits': 200 }, { data: { total_credits: 50, total_usage: 7.9 } })
    expect(await checkProviderKey(fetch, {}, 'sk-or-v1-abc')).toEqual({
      status: 'valid',
      credits: { total: 50, used: 7.9 },
    })
    expect(fetch.urls).toEqual(['https://openrouter.ai/api/v1/credits'])
  })

  test('a regular key (403 on credits) is confirmed by /v1/key', async () => {
    const fetch = responder({ '/v1/credits': 403, '/v1/key': 200 })
    expect(await checkProviderKey(fetch, {}, 'sk-or-v1-abc')).toEqual({ status: 'valid', credits: null })
  })

  test('401 is a rejected key', async () => {
    expect(await checkProviderKey(responder({ '/v1/credits': 401 }), {}, 'sk-or-v1-abc')).toEqual({
      status: 'invalid',
    })
    const fetch = responder({ '/v1/credits': 403, '/v1/key': 401 })
    expect(await checkProviderKey(fetch, {}, 'sk-or-v1-abc')).toEqual({ status: 'invalid' })
  })

  test('an unreachable gateway is unknown, with the reason', async () => {
    const fetch = responder({ '/v1/credits': new Error('getaddrinfo ENOTFOUND') })
    expect(await checkProviderKey(fetch, {}, 'sk-or-v1-abc')).toEqual({
      status: 'unknown',
      reason: 'getaddrinfo ENOTFOUND',
    })
    const down = responder({ '/v1/credits': 503, '/v1/key': 503 })
    expect(await checkProviderKey(down, {}, 'sk-or-v1-abc')).toEqual({
      status: 'unknown',
      reason: 'HTTP 503',
    })
  })
})

describe('provider launcher', () => {
  const options = { tmuxSession: 's', tmuxBin: 'tmux', home: '/Users/u' }

  test('exports the gateway variables, reads the key inside the window and never on a command line', () => {
    const script = renderLauncher(work, options)
    execFileSync('zsh', ['-n', '-c', script])
    expect(script).toContain("export ANTHROPIC_BASE_URL='https://openrouter.ai/api'")
    expect(script).toContain("export ANTHROPIC_MODEL='anthropic/claude-sonnet-5.5'")
    expect(script).toContain('unset ANTHROPIC_API_KEY')
    expect(script).toContain("security find-generic-password -s 'claude-remote' -a 'provider-work' -w")
    expect(script).toContain(`cmd=("\${0:A}" "$@")`)
    expect(script).toContain('-e "CLAUDE_REMOTE_EXEC=1"')
    expect(script).toContain('remote-harness provider key work')
    // The key is read by the window itself, never baked into the file nor passed as an argument.
    expect(script).toContain('ANTHROPIC_AUTH_TOKEN="$(read_provider_key)"')
    expect(script).not.toContain('-e "ANTHROPIC_AUTH_TOKEN')
    // Profiles without a provider keep the launcher they had.
    const plain = renderLauncher(personal, options)
    expect(plain).not.toContain('read_provider_key')
    expect(plain).toContain('cmd=(env -u CLAUDE_CONFIG_DIR "$CLAUDE_BIN" "$@")')
  })

  test('inside the window the key from the file reaches claude; without a key the launcher refuses', async () => {
    const bin = join(home.dir(), 'bin')
    await mkdir(bin, { recursive: true })
    const launcher = join(bin, 'work')
    await writeFile(launcher, renderLauncher(work, { ...options, missingKey: (id) => `no key for ${id}` }))
    await chmod(launcher, 0o755)
    const claude = join(bin, 'fake-claude')
    await writeFile(
      claude,
      '#!/bin/sh\nprintf \'%s|%s|%s\\n\' "$ANTHROPIC_AUTH_TOKEN" "$ANTHROPIC_BASE_URL" "$*"\n',
    )
    await chmod(claude, 0o755)
    const env = { ...process.env, CLAUDE_REMOTE_CLAUDE_BIN: claude, PATH: '/usr/bin:/bin' }

    const refused = spawnSync('zsh', [launcher], { env, encoding: 'utf8' })
    expect(refused.status).toBe(1)
    expect(refused.stderr.trim()).toBe('no key for work')

    await providerKeyStore('file', fakeExecutor(), 'work').set('sk-or-v1-abc')
    const ran = spawnSync('zsh', [launcher, '--resume', 'x'], {
      env: { ...env, CLAUDE_REMOTE_EXEC: '1' },
      encoding: 'utf8',
    })
    expect(ran.status).toBe(0)
    expect(ran.stdout.trim()).toBe('sk-or-v1-abc|https://openrouter.ai/api|--resume x')
  })
})
