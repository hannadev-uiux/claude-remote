import { describe, expect, test } from 'vitest'
import { classifyLink, hasLinks, linkActions, splitLinks, tagLinkTarget } from './links'

const urls = (text: string) => splitLinks(text).flatMap((s) => (s.kind === 'link' ? [s.href] : []))

describe('splitLinks', () => {
  test('splits a bare URL out of the text', () => {
    expect(splitLinks('see https://example.dev/a now')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'link', text: 'https://example.dev/a', href: 'https://example.dev/a' },
      { kind: 'text', text: ' now' },
    ])
  })

  test('text without links is one segment', () => {
    expect(splitLinks('plain text')).toEqual([{ kind: 'text', text: 'plain text' }])
    expect(splitLinks('')).toEqual([])
  })

  test('drops trailing punctuation', () => {
    expect(urls('Deployed to https://app.example.dev.')).toEqual(['https://app.example.dev'])
    expect(urls('Is it http://x.dev/a?, or not')).toEqual(['http://x.dev/a'])
    expect(urls("'https://x.dev/q?a=1&b=2'")).toEqual(['https://x.dev/q?a=1&b=2'])
    expect(urls('cut at https://x.dev/abc…')).toEqual(['https://x.dev/abc'])
  })

  test('keeps balanced parentheses and drops an unmatched one', () => {
    expect(urls('(see https://x.dev/a)')).toEqual(['https://x.dev/a'])
    expect(urls('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual([
      'https://en.wikipedia.org/wiki/Foo_(bar)',
    ])
    expect(urls('[https://x.dev/a]')).toEqual(['https://x.dev/a'])
  })

  test('stops at quotes, angle brackets and backticks', () => {
    expect(urls('<https://x.dev/a>')).toEqual(['https://x.dev/a'])
    expect(urls('"https://x.dev/a"')).toEqual(['https://x.dev/a'])
    expect(urls('`https://x.dev/a`')).toEqual(['https://x.dev/a'])
  })

  test('finds several URLs and mailto', () => {
    expect(urls('a https://a.dev b http://b.dev, mail mailto:me@x.dev')).toEqual([
      'https://a.dev',
      'http://b.dev',
      'mailto:me@x.dev',
    ])
  })

  test('file paths and partial schemes are not links', () => {
    expect(hasLinks('edit src/foo.ts:12 and /Users/me/app/index.ts')).toBe(false)
    expect(hasLinks('file:///etc/hosts')).toBe(false)
    expect(hasLinks('xhttps://x.dev')).toBe(false)
    expect(hasLinks('https:// alone')).toBe(false)
  })

  test('segments rebuild the original text', () => {
    const text = 'a (https://x.dev/a). b https://y.dev/c_(d) e'
    expect(
      splitLinks(text)
        .map((s) => s.text)
        .join(''),
    ).toBe(text)
  })
})

describe('classifyLink', () => {
  test('http, https and mailto are web links', () => {
    expect(classifyLink('https://x.dev')).toEqual({ kind: 'web', value: 'https://x.dev' })
    expect(classifyLink('HTTP://x.dev').kind).toBe('web')
    expect(classifyLink('mailto:me@x.dev').kind).toBe('web')
  })

  test('other schemes are copy-only', () => {
    expect(classifyLink('file:///etc/hosts')).toEqual({ kind: 'other', value: 'file:///etc/hosts' })
    expect(classifyLink('vscode://file/a.ts').kind).toBe('other')
  })

  test('tagged markdown targets come back as the path written', () => {
    expect(classifyLink(tagLinkTarget('src/foo.ts:12'))).toEqual({ kind: 'path', value: 'src/foo.ts:12' })
    expect(classifyLink(tagLinkTarget('/abs/a.ts'))).toEqual({ kind: 'path', value: '/abs/a.ts' })
    expect(classifyLink(tagLinkTarget('C:\\repo\\a.ts'))).toEqual({ kind: 'path', value: 'C:\\repo\\a.ts' })
  })

  test('targets with a scheme are not tagged', () => {
    expect(tagLinkTarget('https://x.dev')).toBe('https://x.dev')
    expect(tagLinkTarget('mailto:me@x.dev')).toBe('mailto:me@x.dev')
  })
})

describe('linkActions', () => {
  test('only web links can be opened', () => {
    expect(linkActions('web')).toEqual(['open', 'copy', 'share'])
    expect(linkActions('path')).toEqual(['copy', 'share'])
    expect(linkActions('other')).toEqual(['copy', 'share'])
  })
})
