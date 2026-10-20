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
      ['close', false],
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

  test('live status follow appears only when the daemon can follow, before Close', () => {
    const base = { controllable: false, keyBarVisible: false, following: false }
    const keys = (liveFollow: boolean | null) =>
      sessionMenu({ ...base, liveFollow }, en).items.map((i) => i.key)
    expect(keys(null)).not.toContain('toggleLiveFollow')
    expect(keys(false).slice(-2)).toEqual(['toggleLiveFollow', 'close'])
    const item = (liveFollow: boolean) =>
      sessionMenu({ ...base, liveFollow }, en).items.find((i) => i.key === 'toggleLiveFollow')
    // Following only involves the phone and the daemon: available for read-only sessions too.
    expect(item(false)).toEqual({ key: 'toggleLiveFollow', label: 'Follow live status', disabled: false })
    expect(item(true)?.label).toBe('Stop following live status')
  })

  test('a provider session offers "Change model…" after the terminal, disabled when read-only', () => {
    const items = (controllable: boolean) =>
      sessionMenu({ controllable, keyBarVisible: false, following: true, provider: true }, en).items
    expect(items(true)[1]).toEqual({ key: 'model', label: 'Change model…', disabled: false })
    expect(items(false)[1]?.disabled).toBe(true)
    const plain = sessionMenu({ controllable: true, keyBarVisible: false, following: true }, en).items
    expect(plain.some((i) => i.key === 'model')).toBe(false)
  })

  test('read-only session disables terminal, keys and close, keeps history and follow, and explains why', () => {
    const menu = sessionMenu({ controllable: false, keyBarVisible: false, following: false }, en)
    expect(menu.items.filter((i) => i.disabled).map((i) => i.key)).toEqual([
      'terminal',
      'toggleKeyBar',
      'close',
    ])
    expect(menu.disabledReason).toMatch(/read-only/i)
  })

  test('subagents appear after the terminal only when the session has some, with their counts', () => {
    const base = { controllable: true, keyBarVisible: false, following: false }
    expect(sessionMenu(base, en).items.map((i) => i.key)).not.toContain('subagents')
    const quiet = sessionMenu({ ...base, subagents: { count: 3, running: 0 } }, en).items
    expect(quiet[1]).toEqual({ key: 'subagents', label: 'Subagents (3)', disabled: false })
    const busy = sessionMenu({ ...base, subagents: { count: 5, running: 2 } }, en).items
    expect(busy[1]?.label).toBe('Subagents (5 · 2 running)')
    // Read-only sessions can still browse their subagents.
    const readOnly = sessionMenu({ ...base, controllable: false, subagents: { count: 1, running: 0 } }, en)
    expect(readOnly.items.find((i) => i.key === 'subagents')?.disabled).toBe(false)
  })

  test('close is the last item and reads "Close session"', () => {
    const menu = sessionMenu({ controllable: true, keyBarVisible: false, following: false }, en)
    expect(menu.items.at(-1)).toEqual({ key: 'close', label: 'Close session', disabled: false })
  })
})
