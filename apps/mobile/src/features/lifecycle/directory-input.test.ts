import { describe, expect, test } from 'vitest'
import {
  completeDirectory,
  directoryToBrowse,
  matchingSuggestions,
  splitDirectoryInput,
  tildify,
} from './directory-input'

describe('splitDirectoryInput', () => {
  test.each([
    ['~/Doc', { dir: '~', prefix: 'Doc' }],
    ['~/Documents/', { dir: '~/Documents', prefix: '' }],
    ['~/Documents/my-', { dir: '~/Documents', prefix: 'my-' }],
    ['~', { dir: '~', prefix: '' }],
    ['~/', { dir: '~', prefix: '' }],
    ['/Users/me/wo', { dir: '/Users/me', prefix: 'wo' }],
    ['/wo', { dir: '/', prefix: 'wo' }],
    ['work', { dir: '~', prefix: 'work' }],
    ['work/ap', { dir: '~/work', prefix: 'ap' }],
    ['  ~//work//ap ', { dir: '~/work', prefix: 'ap' }],
    ['~/.con', { dir: '~', prefix: '.con' }],
  ])('%s', (text, expected) => {
    expect(splitDirectoryInput(text)).toEqual(expected)
  })

  test('empty text has no query', () => {
    expect(splitDirectoryInput('')).toBeNull()
    expect(splitDirectoryInput('   ')).toBeNull()
  })
})

describe('completeDirectory', () => {
  test('joins with a trailing slash', () => {
    expect(completeDirectory('~', 'Documents')).toBe('~/Documents/')
    expect(completeDirectory('~/work', 'api')).toBe('~/work/api/')
    expect(completeDirectory('/', 'Users')).toBe('/Users/')
  })

  test('completing the split of the result lists its children', () => {
    expect(splitDirectoryInput(completeDirectory('~', 'Documents'))).toEqual({
      dir: '~/Documents',
      prefix: '',
    })
  })
})

describe('directoryToBrowse', () => {
  test.each([
    ['', '~'],
    ['~', '~'],
    ['~/', '~'],
    ['~/work/api/', '~/work/api'],
    ['work', '~/work'],
    ['/Users/me/', '/Users/me'],
    ['/', '/'],
  ])('%s → %s', (text, expected) => {
    expect(directoryToBrowse(text)).toBe(expected)
  })
})

describe('tildify', () => {
  test('replaces the home prefix on any OS', () => {
    expect(tildify('/Users/me', '/Users/me')).toBe('~')
    expect(tildify('/Users/me/work/api', '/Users/me')).toBe('~/work/api')
    expect(tildify('/home/me/work', '/home/me/')).toBe('~/work')
  })

  test('keeps other paths and look-alike prefixes', () => {
    expect(tildify('/Users/meow/x', '/Users/me')).toBe('/Users/meow/x')
    expect(tildify('/etc', '/Users/me')).toBe('/etc')
  })
})

describe('matchingSuggestions', () => {
  const item = (name: string) => ({ name, path: `/h/${name}`, git: false })
  const listing = {
    query: { dir: '~', prefix: 'd' },
    items: [item('Desktop'), item('docker'), item('Documents')],
  }

  test('narrows a listing to the current prefix', () => {
    expect(matchingSuggestions(listing, { dir: '~', prefix: 'doc' }, 8).map((i) => i.name)).toEqual([
      'docker',
      'Documents',
    ])
  })

  test('drops a listing of another folder or a prefix that no longer applies', () => {
    expect(matchingSuggestions(listing, { dir: '~/work', prefix: 'd' }, 8)).toEqual([])
    expect(matchingSuggestions(listing, { dir: '~', prefix: '' }, 8)).toEqual([])
    expect(matchingSuggestions(listing, null, 8)).toEqual([])
    expect(matchingSuggestions(undefined, { dir: '~', prefix: 'd' }, 8)).toEqual([])
  })

  test('caps the number of suggestions', () => {
    expect(matchingSuggestions(listing, { dir: '~', prefix: 'D' }, 2)).toHaveLength(2)
  })
})
