import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { resolveProfiles } from '../src/core/config.ts'
import { silentLogger } from '../src/core/logger.ts'
import { agentFor, hasAgentAdapter, profileAgentId } from '../src/features/agents/index.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

describe('agent adapters', () => {
  test('profiles without an agent are Claude Code; its adapter reproduces the old arguments', () => {
    const profile: Profile = { id: 'p', name: 'P', configDir: '/Users/me/.claude', color: '' }
    expect(profileAgentId(profile)).toBe('claude')
    expect(profileAgentId(undefined)).toBe('claude')
    const claude = agentFor(profile)
    expect(claude).toMatchObject({
      id: 'claude',
      name: 'Claude Code',
      command: 'claude',
      configDirEnv: 'CLAUDE_CONFIG_DIR',
    })
    expect(claude.resumeArgs('abc')).toEqual(['--resume', 'abc'])
    expect(claude.worktreeArgs('remote-1')).toEqual(['--worktree', 'remote-1'])
    expect(claude.transcriptsDir('/Users/me/.claude')).toBe('/Users/me/.claude/projects')
  })

  test('agents without an adapter are known to the protocol but cannot run', () => {
    expect(hasAgentAdapter('claude')).toBe(true)
    expect(hasAgentAdapter('codex')).toBe(false)
    expect(() => agentFor({ agent: 'codex' })).toThrow(/no adapter for agent codex/)
  })

  test('resolveProfiles keeps Claude Code profiles and drops those without an adapter', async () => {
    const dir = join(home.dir(), '.claude')
    await mkdir(dir, { recursive: true })
    const config = {
      profiles: [
        { id: 'claudin', name: 'Personal', configDir: dir, color: '#000000' },
        { id: 'codex', name: 'Codex', configDir: dir, color: '#000000', agent: 'codex' as const },
      ],
    }
    const resolved = await resolveProfiles(config as Parameters<typeof resolveProfiles>[0], silentLogger)
    expect(resolved.map((p) => p.id)).toEqual(['claudin'])
  })
})
