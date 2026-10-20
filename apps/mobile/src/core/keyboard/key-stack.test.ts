import { expect, test } from 'vitest'
import { comboId, createDuplicateFilter, createKeyStack } from './key-stack'

test('nativeState asks for priority while any live handler wants it', () => {
  const stack = createKeyStack()
  expect(stack.nativeState('down')).toBe('none')
  stack.add('down', () => undefined)
  expect(stack.nativeState('down')).toBe('normal')
  const remove = stack.add('down', () => undefined, { priority: true })
  expect(stack.nativeState('down')).toBe('priority')
  remove()
  expect(stack.nativeState('down')).toBe('normal')
})

test('the duplicate filter drops a repeat of the same key within the window only', () => {
  const isDuplicate = createDuplicateFilter(15)
  expect(isDuplicate('down', 1000)).toBe(false)
  expect(isDuplicate('down', 1005)).toBe(true)
  expect(isDuplicate('up', 1006)).toBe(false)
  expect(isDuplicate('up', 1030)).toBe(false)
  expect(isDuplicate('up', 1031)).toBe(true)
})

test('comboId lowercases the input and defaults the flags to 0', () => {
  expect(comboId({ input: 'K', modifierFlags: 8 })).toBe('k|8')
  expect(comboId({ input: 'UIKeyInputEscape' })).toBe('uikeyinputescape|0')
  // Android reports special keys as key codes.
  expect(comboId({ input: 111 })).toBe('111|0')
})

test('the newest handler runs first and stops the key', () => {
  const stack = createKeyStack()
  const calls: string[] = []
  stack.add('esc', () => {
    calls.push('shell')
    return true
  })
  stack.add('esc', () => {
    calls.push('sheet')
    return undefined
  })
  expect(stack.dispatch('esc')).toBe(true)
  expect(calls).toEqual(['sheet'])
})

test('a handler returning false passes the key to the older one', () => {
  const stack = createKeyStack()
  const calls: string[] = []
  stack.add('esc', () => {
    calls.push('shell')
    return undefined
  })
  stack.add('esc', () => {
    calls.push('composer')
    return false
  })
  expect(stack.dispatch('esc')).toBe(true)
  expect(calls).toEqual(['composer', 'shell'])
})

test('nothing handles a key without handlers or when all pass', () => {
  const stack = createKeyStack()
  expect(stack.dispatch('esc')).toBe(false)
  stack.add('esc', () => false)
  expect(stack.dispatch('esc')).toBe(false)
})

test('removing one handler keeps the others of the same key', () => {
  const stack = createKeyStack()
  const calls: string[] = []
  stack.add('esc', () => {
    calls.push('shell')
    return undefined
  })
  const remove = stack.add('esc', () => {
    calls.push('sheet')
    return undefined
  })
  remove()
  remove()
  expect(stack.has('esc')).toBe(true)
  stack.dispatch('esc')
  expect(calls).toEqual(['shell'])
})
