import { describe, expect, test } from 'vitest'
import type { PreparedImage } from '../attachments/limits'
import {
  ABSENT_GRACE_MS,
  DRAFT_TTL_MS,
  type Draft,
  type Drafts,
  draftStorageKey,
  draftSummary,
  hasContent,
  MAX_DRAFT_CHARS,
  parseDraftIndex,
  parsePersistedDraft,
  pruneDrafts,
  serializeDraft,
  updateDraft,
} from './logic'

const image = (key: string): PreparedImage => ({
  key,
  uri: `file:///cache/${key}.jpg`,
  base64: 'AAAA',
  mimeType: 'image/jpeg',
  width: 10,
  height: 20,
})

const draft = (patch: Partial<Draft> = {}): Draft => ({
  text: 'hello',
  images: [],
  updatedAt: 1_000,
  imagesLost: 0,
  ...patch,
})

describe('updateDraft', () => {
  test('creates, edits and stamps a draft', () => {
    const one = updateDraft({}, 's1', { text: 'fix' }, 5)
    expect(one).toEqual({ s1: { text: 'fix', images: [], updatedAt: 5, imagesLost: 0 } })
    const two = updateDraft(one, 's1', { text: (current) => `${current} it` }, 9)
    expect(two.s1).toMatchObject({ text: 'fix it', updatedAt: 9 })
  })

  test('keeps the photos when only the text changes, and the other way round', () => {
    const photo = image('a')
    const withPhoto = updateDraft({ s1: draft() }, 's1', { images: [photo] }, 2)
    expect(withPhoto.s1).toMatchObject({ text: 'hello', images: [photo] })
    expect(updateDraft(withPhoto, 's1', { text: 'bye' }, 3).s1?.images).toEqual([photo])
  })

  test('an empty field with no photos discards the draft', () => {
    const drafts: Drafts = { s1: draft(), s2: draft() }
    expect(updateDraft(drafts, 's1', { text: '' }, 2)).toEqual({ s2: draft() })
    const photoOnly = updateDraft({}, 's1', { images: [image('a')] }, 2)
    expect(updateDraft(photoOnly, 's1', { images: [] }, 3)).toEqual({})
  })

  test('returns the same object when nothing changes', () => {
    const drafts: Drafts = { s1: draft() }
    expect(updateDraft(drafts, 's1', { text: 'hello' }, 2)).toBe(drafts)
    expect(updateDraft(drafts, 's2', { text: '' }, 2)).toBe(drafts)
  })

  test('keeps whitespace while typing', () => {
    expect(updateDraft({}, 's1', { text: ' ' }, 1).s1?.text).toBe(' ')
  })
})

describe('draftSummary', () => {
  test('collapses whitespace and cuts long text', () => {
    expect(draftSummary(draft({ text: '  fix\n\nthe   test ' }))).toEqual({ text: 'fix the test' })
    const long = draftSummary(draft({ text: `${'a'.repeat(59)} bcdef` }))
    expect(long).toEqual({ text: `${'a'.repeat(59)}…` })
  })

  test('counts photos without text', () => {
    expect(draftSummary(draft({ text: ' ', images: [image('a'), image('b')] }))).toEqual({ photos: 2 })
  })

  test('nothing for blank drafts', () => {
    expect(draftSummary(draft({ text: '  \n' }))).toBeNull()
    expect(draftSummary(undefined)).toBeNull()
    expect(hasContent(draft({ text: '\t' }))).toBe(false)
  })
})

describe('pruneDrafts', () => {
  const now = 10 * DRAFT_TTL_MS

  test('expires old drafts', () => {
    const drafts: Drafts = {
      old: draft({ updatedAt: now - DRAFT_TTL_MS - 1 }),
      fresh: draft({ updatedAt: now - 1 }),
    }
    expect(Object.keys(pruneDrafts(drafts, now, null))).toEqual(['fresh'])
  })

  test('drops drafts of missing sessions only after the grace period', () => {
    const drafts: Drafts = {
      live: draft({ updatedAt: now - 2 * ABSENT_GRACE_MS }),
      goneIdle: draft({ updatedAt: now - ABSENT_GRACE_MS - 1 }),
      goneRecent: draft({ updatedAt: now - 1_000 }),
    }
    expect(Object.keys(pruneDrafts(drafts, now, new Set(['live'])))).toEqual(['live', 'goneRecent'])
  })

  test('returns the same object when nothing goes', () => {
    const drafts: Drafts = { s1: draft({ updatedAt: now }) }
    expect(pruneDrafts(drafts, now, new Set(['s1']))).toBe(drafts)
  })
})

describe('persistence', () => {
  test('round-trips text and photo references, never the bytes', () => {
    const raw = serializeDraft(draft({ images: [image('a')] }))
    expect(raw).not.toContain('AAAA')
    expect(parsePersistedDraft(raw)).toEqual({
      text: 'hello',
      images: [{ uri: 'file:///cache/a.jpg', width: 10, height: 20 }],
      updatedAt: 1_000,
    })
  })

  test('caps the text and skips blank drafts', () => {
    const raw = serializeDraft(draft({ text: 'x'.repeat(MAX_DRAFT_CHARS + 10) }))
    expect(parsePersistedDraft(raw)?.text).toHaveLength(MAX_DRAFT_CHARS)
    expect(serializeDraft(draft({ text: ' ' }))).toBeNull()
    expect(serializeDraft(undefined)).toBeNull()
  })

  test('rejects malformed items', () => {
    expect(parsePersistedDraft(null)).toBeNull()
    expect(parsePersistedDraft('{')).toBeNull()
    expect(parsePersistedDraft('{"text":1,"updatedAt":2}')).toBeNull()
    expect(parsePersistedDraft('{"text":"a","updatedAt":2,"images":[{"uri":3}]}')).toEqual({
      text: 'a',
      images: [],
      updatedAt: 2,
    })
  })

  test('index and keys', () => {
    expect(parseDraftIndex('["a",1,"b"]')).toEqual(['a', 'b'])
    expect(parseDraftIndex('nope')).toEqual([])
    expect(draftStorageKey('3f2a-9c:x/y')).toBe('remote-harness.draft.3f2a-9c_x_y')
  })
})
