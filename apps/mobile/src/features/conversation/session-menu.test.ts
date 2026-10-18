import type { TranscriptEntry } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { promptHistory } from './prompt-history'
import { sessionMenu } from './session-menu'

const en = createI18n('en-US').t

const entry = (cursor: number, kind: 'user' | 'assistant_text', text: string): TranscriptEntry => {
  const common = {
    text,
    cursor,
    index: 0,
    uuid: `e${cursor}`,
    key: `e${cursor}:0`,
    timestamp: null,
    isSidechain: false,
  }
  return kind === 'user' ? { ...common, kind, images: [] } : { ...common, kind }
}

describe('promptHistory', () => {
  const label = (count: number) => en('images.count', { count })

  test('lists user prompts newest first, skipping empty ones', () => {
    const entries = [
      entry(1, 'user', 'first'),
      entry(2, 'assistant_text', 'answer'),
      entry(3, 'user', '   '),
      entry(4, 'user', ' second\n'),
    ]
    expect(promptHistory(entries, label)).toEqual([
      { key: 'e4:0', text: 'second' },
      { key: 'e1:0', text: 'first' },
    ])
  })

  test('image-only prompts are listed with a label', () => {
    const image = {
      ...entry(5, 'user', ''),
      images: [{ id: '5.0', mediaType: 'image/png', bytes: 1 }],
    } as TranscriptEntry
    expect(promptHistory([image], label)).toEqual([{ key: 'e5:0', text: '1 image' }])
  })

  test('empty transcript', () => {
    expect(promptHistory([], label)).toEqual([])
  })
})

describe('sessionMenu', () => {
  test('controllable session enables everything and labels the toggle by state', () => {
    const hidden = sessionMenu({ controllable: true, keyBarVisible: false, following: true }, en)
    expect(hidden.items.map((i) => [i.key, i.disabled])).toEqual([
      ['terminal', false],
      ['toggleKeyBar', false],
      ['history', false],
      ['toggleFollow', false],
    ])
    expect(hidden.items[1]?.label).toBe('Show keyboard shortcuts')
    expect(hidden.disabledReason).toBeUndefined()
    expect(
      sessionMenu({ controllable: true, keyBarVisible: true, following: true }, en).items[1]?.label,
    ).toBe('Hide keyboard shortcuts')
  })

  test('follow toggle is labeled by the action it takes', () => {
    const label = (following: boolean) =>
      sessionMenu({ controllable: true, keyBarVisible: false, following }, en).items.find(
        (i) => i.key === 'toggleFollow',
      )?.label
    expect(label(true)).toBe('Stop following output')
    expect(label(false)).toBe('Follow output')
  })

  test('read-only session disables terminal and keys, keeps history and follow, and explains why', () => {
    const menu = sessionMenu({ controllable: false, keyBarVisible: false, following: false }, en)
    expect(menu.items.filter((i) => i.disabled).map((i) => i.key)).toEqual(['terminal', 'toggleKeyBar'])
    expect(menu.disabledReason).toMatch(/read-only/i)
  })
})
