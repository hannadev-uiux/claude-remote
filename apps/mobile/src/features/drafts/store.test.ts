import { beforeEach, describe, expect, test } from 'vitest'
import { DRAFT_TTL_MS } from './logic'
import { clearImagesLost, pruneDraftsNow, setDraftImages, setDraftText, useDraftsStore } from './store'

beforeEach(() => useDraftsStore.setState({ drafts: {} }))

describe('drafts store', () => {
  test('keeps one draft per session', () => {
    setDraftText('a', 'first')
    setDraftText('b', 'second')
    setDraftText('a', (current) => `${current}!`)
    const { drafts } = useDraftsStore.getState()
    expect(drafts.a?.text).toBe('first!')
    expect(drafts.b?.text).toBe('second')
  })

  test('sending clears exactly what was sent', () => {
    const photo = { key: 'k', uri: 'u', base64: 'AA', mimeType: 'image/jpeg' as const, width: 1, height: 1 }
    setDraftText('a', 'go')
    setDraftImages('a', [photo])
    setDraftText('a', (current) => (current === 'go' ? '' : current))
    setDraftImages('a', (current) => current.filter((image) => image !== photo))
    expect(useDraftsStore.getState().drafts).toEqual({})
  })

  test('no-op edits keep the state object', () => {
    setDraftText('a', 'same')
    const before = useDraftsStore.getState()
    setDraftText('a', 'same')
    clearImagesLost('a')
    expect(useDraftsStore.getState()).toBe(before)
  })

  test('clears the lost-photos notice and prunes', () => {
    useDraftsStore.setState({
      drafts: {
        a: { text: 'x', images: [], updatedAt: Date.now(), imagesLost: 2 },
        old: { text: 'y', images: [], updatedAt: Date.now() - DRAFT_TTL_MS - 1, imagesLost: 0 },
      },
    })
    clearImagesLost('a')
    pruneDraftsNow(null)
    const { drafts } = useDraftsStore.getState()
    expect(drafts.a?.imagesLost).toBe(0)
    expect(drafts.old).toBeUndefined()
  })
})
