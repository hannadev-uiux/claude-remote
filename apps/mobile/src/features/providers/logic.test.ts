import type { ModelInfo } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import {
  creditsLeft,
  filterModels,
  formatCredits,
  formatPrice,
  modelCapabilities,
  modelDetail,
  modelWarnings,
  providerName,
} from './logic'

const t = createI18n('en-US').t

const sonnet: ModelInfo = {
  id: 'anthropic/claude-sonnet-5.5',
  name: 'Anthropic: Claude Sonnet 5.5',
  contextLength: 200000,
  promptPrice: 3,
  completionPrice: 15,
  tools: true,
  reasoning: true,
  caching: true,
}
const gpt: ModelInfo = {
  id: 'openai/gpt-5.1',
  name: 'OpenAI: GPT-5.1',
  contextLength: 400000,
  promptPrice: 1.25,
  completionPrice: 10,
  tools: true,
  reasoning: false,
  caching: false,
}
const bare: ModelInfo = {
  id: 'x/y',
  name: 'x/y',
  contextLength: null,
  promptPrice: null,
  completionPrice: null,
  tools: false,
  reasoning: false,
  caching: false,
}

describe('providers', () => {
  test('provider name comes from the profile; none for the Anthropic account', () => {
    expect(providerName({ provider: { kind: 'openrouter' } })).toBe('OpenRouter')
    expect(providerName({})).toBeNull()
    expect(providerName(null)).toBeNull()
  })

  test('search matches every word against the id and the name', () => {
    expect(filterModels([sonnet, gpt], '').map((m) => m.id)).toEqual([sonnet.id, gpt.id])
    expect(filterModels([sonnet, gpt], 'Sonnet').map((m) => m.id)).toEqual([sonnet.id])
    expect(filterModels([sonnet, gpt], 'openai 5.1').map((m) => m.id)).toEqual([gpt.id])
    expect(filterModels([sonnet, gpt], 'opus')).toEqual([])
  })

  test('prices, detail line and capabilities', () => {
    expect(formatPrice(3)).toBe('$3')
    expect(formatPrice(15)).toBe('$15')
    expect(formatPrice(1.25)).toBe('$1.25')
    expect(formatPrice(0.075)).toBe('$0.075')
    expect(formatPrice(0.5)).toBe('$0.5')
    expect(formatPrice(0)).toBe('$0')
    expect(modelDetail(sonnet, t)).toBe('200k context · $3 / $15')
    expect(modelDetail(gpt, t)).toBe('400k context · $1.25 / $10')
    expect(modelDetail(bare, t)).toBeNull()
    expect(modelCapabilities(sonnet, t)).toBe('tools ✓ thinking ✓ cache ✓')
    expect(modelCapabilities(gpt, t)).toBe('tools ✓')
    expect(modelCapabilities(bare, t)).toBeNull()
  })

  test('warnings: tool use is required, caching is advised', () => {
    expect(modelWarnings(sonnet, t)).toEqual([])
    expect(modelWarnings(gpt, t)).toEqual(['No prompt caching'])
    expect(modelWarnings(bare, t)).toEqual(['No tool use: Claude Code needs it', 'No prompt caching'])
  })

  test('credits left are never negative', () => {
    expect(creditsLeft({ total: 50, used: 7.9 })).toBeCloseTo(42.1)
    expect(creditsLeft({ total: 5, used: 9 })).toBe(0)
    expect(creditsLeft(null)).toBeNull()
    expect(formatCredits(42.1)).toBe('$42.10')
  })
})
