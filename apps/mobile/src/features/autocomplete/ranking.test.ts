import type { CommandItem, CommandSource } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { highlightRuns, matchCommand, rankCommands } from './ranking'

const cmd = (name: string, source: CommandSource = 'builtin', description = ''): CommandItem => ({
  name,
  description,
  source,
  interactive: false,
})

const names = (sections: ReturnType<typeof rankCommands>) =>
  sections.flatMap((s) => s.data.map((r) => r.item.name))

describe('matchCommand', () => {
  test('tiers: prefix, substring, fuzzy, description', () => {
    expect(matchCommand(cmd('compact'), 'com')).toEqual({ tier: 0, indices: [0, 1, 2], gaps: 0 })
    expect(matchCommand(cmd('deploy-config'), 'con')).toEqual({ tier: 1, indices: [7, 8, 9], gaps: 0 })
    expect(matchCommand(cmd('rename'), 'rnm')).toEqual({ tier: 2, indices: [0, 2, 4], gaps: 2 })
    expect(matchCommand(cmd('model', 'builtin', 'Choose the model'), 'choose')).toMatchObject({ tier: 3 })
    expect(matchCommand(cmd('model'), 'zzz')).toBeNull()
  })

  test('is case-insensitive', () => {
    expect(matchCommand(cmd('Deploy'), 'dEp')).toMatchObject({ tier: 0 })
  })
})

describe('rankCommands', () => {
  const commands = [
    cmd('model'),
    cmd('compact'),
    cmd('config'),
    cmd('context'),
    cmd('copy'),
    cmd('deploy-config', 'project'),
    cmd('fix', 'profile'),
    cmd('figma:implement', 'plugin', 'Implement a design'),
  ]

  test('no query: every command in source sections, by name, no limit', () => {
    const many = [...commands, ...Array.from({ length: 60 }, (_, i) => cmd(`skill-${i}`, 'plugin'))]
    const sections = rankCommands(many, '')
    expect(sections.map((s) => s.key)).toEqual(['builtin', 'project', 'profile', 'plugin'])
    expect(sections[0]!.data.map((r) => r.item.name)).toEqual([
      'compact',
      'config',
      'context',
      'copy',
      'model',
    ])
    expect(names(sections)).toHaveLength(many.length)
  })

  test('no query: recent section first, not repeated below, only listed names, at most five', () => {
    const sections = rankCommands(commands, '', [
      'fix',
      'gone',
      'model',
      'copy',
      'config',
      'context',
      'compact',
    ])
    expect(sections[0]).toMatchObject({ key: 'recent' })
    expect(sections[0]!.data.map((r) => r.item.name)).toEqual(['fix', 'model', 'copy', 'config', 'context'])
    expect(sections.map((s) => s.key)).toEqual(['recent', 'builtin', 'project', 'plugin'])
    expect(names(sections).filter((n) => n === 'model')).toHaveLength(1)
  })

  test('query: prefix before substring, fuzzy and description', () => {
    expect(names(rankCommands(commands, 'co'))).toEqual([
      'copy',
      'config',
      'compact',
      'context',
      'deploy-config',
    ])
    expect(names(rankCommands(commands, 'design'))).toEqual(['figma:implement'])
  })

  test('query: recents win ties', () => {
    expect(names(rankCommands(commands, 'co', ['context'])).slice(0, 2)).toEqual(['context', 'copy'])
  })

  test('query: highlight indices and empty result', () => {
    const [section] = rankCommands([cmd('rename')], 'rnm')
    expect(section).toEqual({ key: 'results', data: [{ item: cmd('rename'), indices: [0, 2, 4] }] })
    expect(rankCommands(commands, 'zzzz')).toEqual([])
  })
})

describe('highlightRuns', () => {
  test('groups consecutive characters', () => {
    expect(highlightRuns('rename', [0, 2, 3])).toEqual([
      { text: 'r', hit: true },
      { text: 'e', hit: false },
      { text: 'na', hit: true },
      { text: 'me', hit: false },
    ])
    expect(highlightRuns('model', [])).toEqual([{ text: 'model', hit: false }])
  })
})
