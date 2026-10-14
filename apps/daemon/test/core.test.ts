import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { ConfigError, loadConfig, resolveProfiles } from '../src/core/config.ts'
import { EventBus } from '../src/core/event-bus.ts'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { ensureToken, FileTokenStore, KeychainTokenStore } from '../src/core/secrets.ts'
import { findTailscaleAddress, isTailscaleAddress } from '../src/infra/network.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

describe('EventBus', () => {
  test('delivers payloads and unsubscribes', () => {
    const bus = new EventBus<{ a: number }>()
    const fn = vi.fn()
    const off = bus.on('a', fn)
    bus.emit('a', 1)
    off()
    bus.emit('a', 2)
    expect(fn).toHaveBeenCalledExactlyOnceWith(1)
  })
})

describe('config', () => {
  test('creates default profiles on first run', async () => {
    const config = await loadConfig(silentLogger)
    expect(config.profiles.map((p) => p.id)).toEqual(['claudin', 'drclaude'])
    expect(config.wsPort).toBe(7337)
    const written = JSON.parse(await readFile(paths.config(), 'utf8'))
    expect(written.profiles).toHaveLength(2)
  })

  test('fails with the invalid field', async () => {
    await mkdir(join(home.dir(), '.claude-remote'), { recursive: true })
    await writeFile(paths.config(), JSON.stringify({ profiles: [{ id: 'x' }] }))
    await expect(loadConfig(silentLogger)).rejects.toThrow(/profiles\.0\.name/)
  })

  test('fails on invalid JSON', async () => {
    await mkdir(join(home.dir(), '.claude-remote'), { recursive: true })
    await writeFile(paths.config(), '{nope')
    await expect(loadConfig(silentLogger)).rejects.toBeInstanceOf(ConfigError)
  })

  test('ignores profiles whose config dir is missing', async () => {
    const existing = join(home.dir(), 'profile-a')
    await mkdir(existing)
    const config = await loadConfig(silentLogger)
    const warn = vi.spyOn(silentLogger, 'warn')
    const profiles = await resolveProfiles(
      {
        ...config,
        profiles: [
          { id: 'a', name: 'A', configDir: existing, color: '#fff' },
          { id: 'b', name: 'B', configDir: join(home.dir(), 'missing'), color: '#fff' },
        ],
      },
      silentLogger,
    )
    expect(profiles.map((p) => p.id)).toEqual(['a'])
    expect(warn).toHaveBeenCalled()
  })
})

describe('token stores', () => {
  test('keychain store uses the security CLI', async () => {
    const exec = fakeExecutor((call) =>
      call.args[0] === 'find-generic-password' ? { exitCode: 44, stdout: '' } : undefined,
    )
    const token = await ensureToken(new KeychainTokenStore(exec))
    expect(token.length).toBeGreaterThan(30)
    expect(exec.calls.map((c) => c.args[0])).toEqual(['find-generic-password', 'add-generic-password'])
    expect(exec.calls[1]?.args).toContain(token)
  })

  test('keeps an existing token', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'abc\n' }))
    expect(await ensureToken(new KeychainTokenStore(exec))).toBe('abc')
  })

  test('file store persists with restricted permissions', async () => {
    const store = new FileTokenStore()
    const token = await ensureToken(store)
    expect(await new FileTokenStore().get()).toBe(token)
  })
})

describe('tailscale discovery', () => {
  test('accepts only 100.64.0.0/10', () => {
    expect(isTailscaleAddress('100.64.0.1')).toBe(true)
    expect(isTailscaleAddress('100.127.255.255')).toBe(true)
    expect(isTailscaleAddress('100.128.0.1')).toBe(false)
    expect(isTailscaleAddress('192.168.0.10')).toBe(false)
  })

  test('picks the tailscale interface', () => {
    const iface = (address: string, internal = false) => ({
      address,
      internal,
      family: 'IPv4' as const,
      netmask: '',
      mac: '',
      cidr: null,
    })
    expect(findTailscaleAddress({ en0: [iface('192.168.0.2')], utun4: [iface('100.101.1.2')] })).toBe(
      '100.101.1.2',
    )
    expect(findTailscaleAddress({ en0: [iface('192.168.0.2')] })).toBeNull()
  })
})
