import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import {
  detectConfigDirs,
  mergeConfig,
  profilesToRemove,
  suggestProfile,
  tildify,
  validateAlias,
} from '../src/features/setup/profiles.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

const profile = (id: string, configDir: string): Profile => ({ id, name: id, configDir, color: '#fff' })

describe('setup profiles', () => {
  test('detects ~/.claude and ~/.claude-* dirs, default first, ignoring files and our own dir', async () => {
    const dir = home.dir()
    for (const name of ['.claude-work', '.claude', '.claude-remote', '.claude-b', '.claudex', 'claude'])
      await mkdir(join(dir, name))
    await writeFile(join(dir, '.claude.json'), '{}')
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
})
