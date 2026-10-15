import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import {
  detectConfigDirs,
  mergeConfig,
  profilesToRemove,
  readLogin,
  suggestNewConfigDir,
  suggestProfile,
  tildify,
  validateAlias,
  validateNewConfigDir,
} from '../src/features/setup/profiles.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

const profile = (id: string, configDir: string): Profile => ({ id, name: id, configDir, color: '#fff' })

describe('setup profiles', () => {
  test('detects ~/.claude and used ~/.claude-* dirs, default first, ignoring other tools', async () => {
    const dir = home.dir()
    for (const name of ['.claude-work', '.claude', '.claude-remote', '.claude-b', '.claudex', 'claude'])
      await mkdir(join(dir, name))
    await writeFile(join(dir, '.claude.json'), '{}')
    await writeFile(join(dir, '.claude-work', 'settings.json'), '{}')
    await mkdir(join(dir, '.claude-b', 'projects'))
    await mkdir(join(dir, '.claude-mem', 'projects'), { recursive: true })
    await mkdir(join(dir, '.claude-empty'))
    expect(await detectConfigDirs(dir)).toEqual(['~/.claude', '~/.claude-b', '~/.claude-work'])
    expect(await detectConfigDirs(join(dir, 'missing'))).toEqual([])
  })

  test('suggests alias and name, keeping what is already configured', () => {
    expect(suggestProfile('~/.claude', [], 0)).toMatchObject({
      id: 'claudin',
      name: 'Pessoal',
      color: '#D97757',
    })
    expect(suggestProfile('~/.claude-Work_Acme', [], 1)).toMatchObject({
      id: 'claude-work_acme',
      name: 'Work Acme',
      color: '#61AFEF',
    })
    const existing = [{ ...profile('pessoal', '~/.claude/'), name: 'Eu' }]
    expect(suggestProfile('~/.claude', existing, 0)).toMatchObject({ id: 'pessoal', name: 'Eu' })
  })

  test('validates aliases', () => {
    expect(validateAlias('trabalho', [])).toBe(true)
    expect(validateAlias('cc-2', [])).toBe(true)
    expect(validateAlias('claude', [])).toContain('reservado')
    expect(validateAlias('claude-remote', [])).toContain('reservado')
    expect(validateAlias('Trabalho', [])).toContain('minúsculas')
    expect(validateAlias('1x', [])).toContain('minúsculas')
    expect(validateAlias('a b', [])).toContain('minúsculas')
    expect(validateAlias('dup', ['dup'])).toContain('já é usado')
  })

  test('merges profiles into the raw config keeping other keys', () => {
    const next = [profile('a', '~/.claude')]
    expect(mergeConfig({ wsPort: 9000, profiles: [] }, next)).toEqual({ wsPort: 9000, profiles: next })
    expect(mergeConfig(undefined, next)).toEqual({ profiles: next })
  })

  test('removes launchers of dropped aliases and hooks of dropped dirs only', () => {
    const previous = [profile('claudin', '~/.claude'), profile('work', '~/.claude-work')]
    const next = [profile('pessoal', '~/.claude')]
    expect(profilesToRemove(previous, next)).toEqual({ launchers: previous, hooks: [previous[1]] })
  })

  test('tildify', () => {
    expect(tildify('/Users/u/.claude', '/Users/u')).toBe('~/.claude')
    expect(tildify('/opt/x', '/Users/u')).toBe('/opt/x')
  })

  test('suggests a free folder for a new account', async () => {
    const dir = home.dir()
    expect(suggestNewConfigDir([], dir)).toBe('~/.claude')
    await mkdir(join(dir, '.claude'))
    expect(suggestNewConfigDir([], dir)).toBe('~/.claude-trabalho')
    await mkdir(join(dir, '.claude-trabalho'))
    expect(suggestNewConfigDir(['~/.claude-pessoal'], dir)).toBe('~/.claude-conta-2')
  })

  test('validates the folder of a new account', async () => {
    const dir = home.dir()
    await writeFile(join(dir, 'file'), '')
    expect(validateNewConfigDir(join(dir, '.claude-novo'), [])).toBe(true)
    expect(validateNewConfigDir('.claude-novo', [])).toMatch(/caminho absoluto/)
    expect(validateNewConfigDir(join(dir, '.claude-mem'), [])).toMatch(/outra ferramenta/)
    expect(validateNewConfigDir(`${join(dir, '.claude-a')}/`, [join(dir, '.claude-a')])).toMatch(/já está/)
    expect(validateNewConfigDir(join(dir, 'file'), [])).toMatch(/arquivo/)
  })

  test('reads who is logged in to a config dir', async () => {
    const dir = home.dir()
    const account = join(dir, '.claude-work')
    await mkdir(account)
    expect(await readLogin(account, dir)).toBeNull()
    await writeFile(join(account, '.claude.json'), '{"hasCompletedOnboarding":true}')
    expect(await readLogin(account, dir)).toBeNull()
    await writeFile(join(account, '.claude.json'), '{"oauthAccount":{"emailAddress":"a@b.c"}}')
    expect(await readLogin(account, dir)).toBe('a@b.c')
    await writeFile(join(dir, '.claude.json'), '{"primaryApiKey":"sk-x"}')
    expect(await readLogin(join(dir, '.claude'), dir)).toBe('chave de API')
  })
})
