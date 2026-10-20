import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { messagesFor } from '../src/core/i18n/index.ts'
import {
  detectConfigDirs,
  mergeConfig,
  profilesToRemove,
  readLogin,
  suggestNewConfigDir,
  suggestProfile,
  suggestProviderProfile,
  tildify,
  validateAlias,
  validateNewConfigDir,
} from '../src/features/setup/profiles.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()
const pt = messagesFor('pt-BR').profiles
const en = messagesFor('en-US').profiles

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
    expect(suggestProfile('~/.claude', [], 0, pt)).toMatchObject({
      id: 'claudin',
      name: 'Pessoal',
      color: '#D97757',
    })
    expect(suggestProfile('~/.claude-Work_Acme', [], 1, pt)).toMatchObject({
      id: 'claude-work_acme',
      name: 'Work Acme',
      color: '#61AFEF',
    })
    const existing = [{ ...profile('pessoal', '~/.claude/'), name: 'Eu' }]
    expect(suggestProfile('~/.claude', existing, 0, pt)).toMatchObject({ id: 'pessoal', name: 'Eu' })
    expect(suggestProfile('~/.claude', [], 0, en)).toMatchObject({ id: 'claudin', name: 'Personal' })
  })

  test('suggests a provider profile with a free alias and folder', () => {
    expect(suggestProviderProfile('openrouter', ['claudin'], ['~/.claude'], 1)).toEqual({
      id: 'openrouter',
      name: 'OpenRouter',
      configDir: '~/.claude-openrouter',
      color: '#61AFEF',
      provider: { kind: 'openrouter' },
    })
    expect(
      suggestProviderProfile('openrouter', ['openrouter', 'openrouter-2'], ['~/.claude-openrouter/'], 0),
    ).toMatchObject({ id: 'openrouter-3', configDir: '~/.claude-openrouter-2' })
  })

  test('validates aliases', () => {
    expect(validateAlias('trabalho', [], pt)).toBe(true)
    expect(validateAlias('cc-2', [], pt)).toBe(true)
    expect(validateAlias('claude', [], pt)).toContain('reservado')
    expect(validateAlias('remote-harness', [], pt)).toContain('reservado')
    expect(validateAlias('Trabalho', [], pt)).toContain('minúsculas')
    expect(validateAlias('1x', [], pt)).toContain('minúsculas')
    expect(validateAlias('a b', [], pt)).toContain('minúsculas')
    expect(validateAlias('dup', ['dup'], pt)).toContain('já é usado')
    expect(validateAlias('claude', [], en)).toContain('reserved')
    expect(validateAlias('dup', ['dup'], en)).toContain('already used')
  })

  test('merges profiles into the raw config keeping other keys', () => {
    const next = [profile('a', '~/.claude')]
    expect(mergeConfig({ wsPort: 9000, profiles: [] }, next)).toEqual({ wsPort: 9000, profiles: next })
    expect(mergeConfig(undefined, next)).toEqual({ profiles: next })
    expect(mergeConfig({ wsPort: 9000, language: 'pt-BR' }, next, 'es-ES')).toEqual({
      wsPort: 9000,
      profiles: next,
      language: 'es-ES',
    })
    expect(mergeConfig({ language: 'pt-BR' }, next)).toEqual({ profiles: next, language: 'pt-BR' })
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
    expect(suggestNewConfigDir([], pt, dir)).toBe('~/.claude')
    await mkdir(join(dir, '.claude'))
    expect(suggestNewConfigDir([], pt, dir)).toBe('~/.claude-trabalho')
    await mkdir(join(dir, '.claude-trabalho'))
    expect(suggestNewConfigDir(['~/.claude-pessoal'], pt, dir)).toBe('~/.claude-conta-2')
    expect(suggestNewConfigDir([], en, dir)).toBe('~/.claude-work')
    expect(suggestNewConfigDir([], messagesFor('es-ES').profiles, dir)).toBe('~/.claude-trabajo')
  })

  test('validates the folder of a new account', async () => {
    const dir = home.dir()
    await writeFile(join(dir, 'file'), '')
    expect(validateNewConfigDir(join(dir, '.claude-novo'), [], pt)).toBe(true)
    expect(validateNewConfigDir('.claude-novo', [], pt)).toMatch(/caminho absoluto/)
    expect(validateNewConfigDir(join(dir, '.claude-mem'), [], pt)).toMatch(/outra ferramenta/)
    expect(validateNewConfigDir(`${join(dir, '.claude-a')}/`, [join(dir, '.claude-a')], pt)).toMatch(
      /já está/,
    )
    expect(validateNewConfigDir(join(dir, 'file'), [], pt)).toMatch(/arquivo/)
    expect(validateNewConfigDir('.claude-new', [], en)).toMatch(/absolute path/)
  })

  test('reads who is logged in to a config dir', async () => {
    const dir = home.dir()
    const account = join(dir, '.claude-work')
    await mkdir(account)
    expect(await readLogin(account, pt, dir)).toBeNull()
    await writeFile(join(account, '.claude.json'), '{"hasCompletedOnboarding":true}')
    expect(await readLogin(account, pt, dir)).toBeNull()
    await writeFile(join(account, '.claude.json'), '{"oauthAccount":{"emailAddress":"a@b.c"}}')
    expect(await readLogin(account, pt, dir)).toBe('a@b.c')
    await writeFile(join(dir, '.claude.json'), '{"primaryApiKey":"sk-x"}')
    expect(await readLogin(join(dir, '.claude'), pt, dir)).toBe('chave de API')
    expect(await readLogin(join(dir, '.claude'), en, dir)).toBe('API key')
  })
})
