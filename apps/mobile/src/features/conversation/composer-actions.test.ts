import { describe, expect, test } from 'vitest'
import { type ComposerState, composerActions } from './composer-actions'

const base: ComposerState = {
  hasText: false,
  hasAttachments: false,
  voiceActive: false,
  sending: false,
  hasAttach: true,
  hasVoice: true,
}

describe('composerActions', () => {
  test('empty field shows attach and mic, no Send', () => {
    expect(composerActions(base)).toEqual({ attach: true, voice: true, send: false })
  })

  test('typing swaps both for Send', () => {
    expect(composerActions({ ...base, hasText: true })).toEqual({ attach: false, voice: false, send: true })
  })

  test('photos without text keep attach to add more', () => {
    expect(composerActions({ ...base, hasAttachments: true })).toEqual({
      attach: true,
      voice: false,
      send: true,
    })
  })

  test('an active recording keeps the mic', () => {
    expect(composerActions({ ...base, hasText: true, voiceActive: true })).toMatchObject({ voice: true })
  })

  test('sending keeps Send for its spinner', () => {
    expect(composerActions({ ...base, sending: true })).toMatchObject({ send: true })
  })

  test('without extra buttons Send is always there', () => {
    expect(composerActions({ ...base, hasAttach: false, hasVoice: false })).toEqual({
      attach: false,
      voice: false,
      send: true,
    })
  })
})
