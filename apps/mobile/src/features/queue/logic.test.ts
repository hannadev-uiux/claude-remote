import { expect, test } from 'vitest'
import { willQueue } from './logic'

test('willQueue: busy session, pending permission or a non-empty queue hold the prompt', () => {
  expect(willQueue({ state: 'idle' }, 0, 0)).toBe(false)
  expect(willQueue({ state: 'running' }, 0, 0)).toBe(true)
  expect(willQueue({ state: 'waiting' }, 0, 0)).toBe(true)
  expect(willQueue({ state: 'idle' }, 1, 0)).toBe(true)
  expect(willQueue({ state: 'idle' }, 0, 2)).toBe(true)
  expect(willQueue({ state: 'ended' }, 0, 0)).toBe(false)
  expect(willQueue(undefined, 3, 3)).toBe(false)
})
