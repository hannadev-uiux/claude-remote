import { describe, expect, test } from 'vitest'
import { hasRegisteredIcon, REGISTERED_ICON_IDS } from './ids'

describe('hasRegisteredIcon', () => {
  test('true for every known agent and provider id', () => {
    for (const id of REGISTERED_ICON_IDS) expect(hasRegisteredIcon(id)).toBe(true)
    expect(REGISTERED_ICON_IDS).toEqual(['claude', 'codex', 'kimi', 'qwen', 'openrouter'])
  })

  test('false for an id without a registered icon', () => {
    expect(hasRegisteredIcon('some-future-agent')).toBe(false)
  })
})
