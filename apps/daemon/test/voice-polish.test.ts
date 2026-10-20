import type { Profile } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { VoicePolishService } from '../src/features/voice-polish/service.ts'
import { fakeExecutor } from './helpers.ts'

const claudeProfile: Profile = { id: 'p', name: 'P', configDir: '/Users/me/.claude', color: '' }
const codexProfile: Profile = { id: 'p', name: 'P', configDir: '/Users/me/.codex', color: '', agent: 'codex' }
const providerProfile: Profile = {
  ...claudeProfile,
  provider: { kind: 'openrouter' },
}

describe('VoicePolishService', () => {
  test('rewrites the text on a successful call', async () => {
    const exec = fakeExecutor(() => ({
      stdout: JSON.stringify({ result: 'continue the tests' }),
      exitCode: 0,
    }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(claudeProfile, 'so, um, continue the tests')
    expect(result).toEqual({ text: 'continue the tests', applied: true })
    expect(exec.calls[0]?.file).toBe('claude')
    expect(exec.calls[0]?.args).toContain('so, um, continue the tests')
  })

  test('falls back to the original on a non-zero exit', async () => {
    const exec = fakeExecutor(() => ({ stdout: '', stderr: 'boom', exitCode: 1 }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(claudeProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
  })

  test('falls back to the original on a timeout', async () => {
    const exec = fakeExecutor(() => ({ stdout: '', stderr: '', exitCode: 1, timedOut: true }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(claudeProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
  })

  test('falls back to the original on unparsable output', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'not json', exitCode: 0 }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(claudeProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
  })

  test('skips the call for an agent without polish support', async () => {
    const exec = fakeExecutor()
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(codexProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
    expect(exec.calls).toHaveLength(0)
  })

  test('skips the call for a profile routed through a provider', async () => {
    const exec = fakeExecutor()
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(providerProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
    expect(exec.calls).toHaveLength(0)
  })

  test('falls back when the rewrite is identical to the original', async () => {
    const exec = fakeExecutor(() => ({ stdout: JSON.stringify({ result: 'hello' }), exitCode: 0 }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    const result = await service.polish(claudeProfile, 'hello')
    expect(result).toEqual({ text: 'hello', applied: false })
  })

  test('sets CLAUDE_CONFIG_DIR only for a non-default config dir', async () => {
    const exec = fakeExecutor(() => ({ stdout: JSON.stringify({ result: 'x' }), exitCode: 0 }))
    const service = new VoicePolishService({ exec, logger: silentLogger })
    await service.polish({ ...claudeProfile, configDir: '/custom/dir' }, 'hello')
    expect(exec.calls[0]?.options?.env).toEqual({ CLAUDE_CONFIG_DIR: '/custom/dir' })
  })
})
