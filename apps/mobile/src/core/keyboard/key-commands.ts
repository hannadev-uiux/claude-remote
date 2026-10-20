import { useEffect, useRef } from 'react'
import { constants, eventEmitter, registerKeyCommands, unregisterKeyCommands } from 'react-native-key-command'
import {
  comboId,
  createDuplicateFilter,
  createKeyStack,
  type KeyCombo,
  type KeyHandler,
  type KeyOptions,
  type NativeState,
} from './key-stack'

export type { KeyCombo, KeyHandler, KeyOptions }
export { constants as keys }

const stack = createKeyStack()
/** What each combination holds natively right now (absent: never registered). */
const native = new Map<string, Exclude<NativeState, 'none'>>()
let subscribed = false
/** Events of the same key closer than this are one press delivered twice. */
const isDuplicate = createDuplicateFilter(15)

/**
 * Keeps the native command of a combination in line with its handlers: registered with the first
 * one, and registered again when priority is asked for or given up. It is never removed: without
 * priority it does not take keys from a focused field, a key nobody handles does nothing, and
 * builds without the patched library cannot unregister on iOS (each removal would leave a duplicate).
 * Native calls run in order on the main queue.
 */
function sync(id: string, combo: KeyCombo): void {
  const want = stack.nativeState(id) === 'priority' ? 'priority' : 'normal'
  const current = native.get(id)
  if (want === current) return
  const command = {
    input: String(combo.input),
    ...(combo.modifierFlags ? { modifierFlags: combo.modifierFlags } : {}),
  }
  if (current) unregisterKeyCommands([command]).catch(() => undefined)
  registerKeyCommands([{ ...command, ...(want === 'priority' ? { priority: true } : {}) }]).catch(
    () => undefined,
  )
  native.set(id, want)
}

/** Listens to a hardware key; the newest handler sees it first and can pass it with `false`. */
export function onKeyCommand(combo: KeyCombo, handler: KeyHandler, options: KeyOptions = {}): () => void {
  const id = comboId(combo)
  if (!subscribed) {
    subscribed = true
    eventEmitter.addListener('onKeyCommand', (event) => {
      const eventId = comboId(event)
      if (!isDuplicate(eventId, Date.now())) stack.dispatch(eventId)
    })
  }
  const remove = stack.add(id, handler, options)
  sync(id, combo)
  return () => {
    remove()
    sync(id, combo)
  }
}

/**
 * `onKeyCommand` for a component: the latest `handler` runs, and the key is only taken while
 * `enabled`. Registered later than the shell's handlers, so it sees the key first.
 */
export function useKeyCommand(
  combo: KeyCombo,
  handler: KeyHandler,
  enabled = true,
  options: KeyOptions = {},
): void {
  const latest = useRef(handler)
  latest.current = handler
  const id = comboId(combo)
  const priority = options.priority === true
  // biome-ignore lint/correctness/useExhaustiveDependencies: the id stands for the combination.
  useEffect(() => {
    if (!enabled) return
    return onKeyCommand(combo, () => latest.current(), { priority })
  }, [id, enabled, priority])
}
