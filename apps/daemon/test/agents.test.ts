import { copyFile, mkdir, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { resolveProfiles } from '../src/core/config.ts'
import { silentLogger } from '../src/core/logger.ts'
import { adapterOf, agentFor, hasAgentAdapter, profileAgentId } from '../src/features/agents/index.ts'
import { scanRecentTranscripts } from '../src/features/sessions/recent-scan.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()
const fixtures = join(import.meta.dirname, 'fixtures')
const SESSION = '0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f'

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
      statusLine: true,
      providers: true,
      modes: true,
    })
    expect(claude.resumeArgs('abc')).toEqual(['--resume', 'abc'])
    expect(claude.worktreeArgs('remote-1')).toEqual(['--worktree', 'remote-1'])
    expect(claude.hooks.file('/Users/me/.claude')).toBe('/Users/me/.claude/settings.json')
    const polishArgs = claude.polish?.args('so, um, continue the tests')
    expect(polishArgs?.slice(0, 2)).toEqual(['-p', 'so, um, continue the tests'])
    expect(polishArgs).toContain('--model')
    expect(polishArgs).toContain('haiku')
    expect(polishArgs).toContain('--output-format')
    expect(polishArgs).toContain('json')
    expect(polishArgs).toContain('--allowedTools')
    expect(polishArgs).toContain('--append-system-prompt')
  })

  test('Codex: CODEX_HOME, codex resume, no worktree, hooks.json', () => {
    const codex = agentFor({ agent: 'codex' })
    expect(codex).toMatchObject({
      id: 'codex',
      name: 'Codex',
      command: 'codex',
      configDirEnv: 'CODEX_HOME',
      defaultConfigDir: '~/.codex',
      statusLine: false,
      providers: false,
      modes: false,
    })
    expect(codex.resumeArgs('abc')).toEqual(['resume', 'abc'])
    expect(codex.worktreeArgs('remote-1')).toBeNull()
    expect(codex.hooks).toMatchObject({ style: 'codex-hooks' })
    expect(codex.hooks.file('/Users/me/.codex')).toBe('/Users/me/.codex/hooks.json')
    expect(codex.input.minEnterDelayMs).toBeGreaterThanOrEqual(250)
    expect(codex.polish).toBeNull()
  })

  test('agents without an adapter are known to the protocol but cannot run', () => {
    expect(hasAgentAdapter('claude')).toBe(true)
    expect(hasAgentAdapter('codex')).toBe(true)
    expect(hasAgentAdapter('kimi')).toBe(false)
    expect(() => agentFor({ agent: 'kimi' })).toThrow(/no adapter for agent kimi/)
    expect(adapterOf(undefined).id).toBe('claude')
    expect(adapterOf('kimi').id).toBe('claude')
    expect(adapterOf('codex').id).toBe('codex')
  })

  test('resolveProfiles keeps Claude Code and Codex profiles and drops those without an adapter', async () => {
    const dir = join(home.dir(), '.claude')
    await mkdir(dir, { recursive: true })
    const config = {
      profiles: [
        { id: 'claudin', name: 'Personal', configDir: dir, color: '#000000' },
        { id: 'cdx', name: 'Codex', configDir: dir, color: '#000000', agent: 'codex' as const },
        { id: 'kimi', name: 'Kimi', configDir: dir, color: '#000000', agent: 'kimi' as const },
      ],
    }
    const resolved = await resolveProfiles(config as Parameters<typeof resolveProfiles>[0], silentLogger)
    expect(resolved.map((p) => p.id)).toEqual(['claudin', 'cdx'])
  })
})

describe('codex rollouts on disk', () => {
  async function codexHome(): Promise<{ configDir: string; rollout: string }> {
    const configDir = join(home.dir(), '.codex')
    const now = new Date()
    const day = join(
      configDir,
      'sessions',
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    )
    await mkdir(day, { recursive: true })
    const rollout = join(day, `rollout-2026-10-19T14-37-08-${SESSION}.jsonl`)
    await copyFile(join(fixtures, 'codex-paginated.jsonl'), rollout)
    await writeFile(join(day, 'notes.txt'), 'not a rollout')
    // An old rollout in an old day folder is not listed.
    const old = join(configDir, 'sessions', '2020', '01', '02')
    await mkdir(old, { recursive: true })
    const oldFile = join(old, 'rollout-2020-01-02T10-00-00-0198a1b2-0000-7000-8000-000000000001.jsonl')
    await copyFile(join(fixtures, 'codex-legacy.jsonl'), oldFile)
    await utimes(oldFile, new Date('2020-01-02'), new Date('2020-01-02'))
    return { configDir, rollout }
  }

  test('finds recent rollouts by the session id in their name', async () => {
    const { configDir, rollout } = await codexHome()
    const profile: Profile = { id: 'cdx', name: 'Codex', configDir, color: '', agent: 'codex' }
    const files = await scanRecentTranscripts([profile], { days: 7, maxPerProfile: 10 })
    expect(files).toEqual([{ profileId: 'cdx', sessionId: SESSION, path: rollout, mtime: expect.any(Date) }])
  })

  test('summary: thread name, else first prompt; folder and approval policy', async () => {
    const { configDir, rollout } = await codexHome()
    const codex = agentFor({ agent: 'codex' })
    expect(await codex.readSummary(rollout, configDir)).toEqual({
      title: 'run the tests',
      cwd: '/Users/me/proj',
      permissionMode: null,
      approvalPolicy: 'never',
    })
    await writeFile(
      join(configDir, 'session_index.jsonl'),
      `${JSON.stringify({ id: SESSION, thread_name: 'Tailwind upgrade', updated_at: 'x' })}\n`,
    )
    expect((await codex.readSummary(rollout, configDir)).title).toBe('Tailwind upgrade')
  })
})
