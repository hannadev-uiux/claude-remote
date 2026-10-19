import { expect, test } from 'vitest'
import { cycleMode, nthSessionId } from './logic'

test('cycleMode walks default → acceptEdits → plan → default and never reaches auto', () => {
  expect(cycleMode('default')).toBe('acceptEdits')
  expect(cycleMode('acceptEdits')).toBe('plan')
  expect(cycleMode('plan')).toBe('default')
  expect(cycleMode('auto')).toBe('default')
  expect(cycleMode('bypassPermissions')).toBe('default')
  expect(cycleMode(null)).toBe('default')
})

test('nthSessionId is 1-based and null past the end', () => {
  const ids = ['a', 'b', 'c']
  expect(nthSessionId(ids, 1)).toBe('a')
  expect(nthSessionId(ids, 3)).toBe('c')
  expect(nthSessionId(ids, 4)).toBeNull()
  expect(nthSessionId(ids, 0)).toBeNull()
  expect(nthSessionId([], 1)).toBeNull()
})
