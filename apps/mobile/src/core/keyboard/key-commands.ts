import { useEffect, useRef } from 'react'
import { constants, eventEmitter, registerKeyCommands } from 'react-native-key-command'
import { comboId, createKeyStack, type KeyCombo, type KeyHandler } from './key-stack'

export type { KeyCombo, KeyHandler }
export { constants as keys }

const stack = createKeyStack()
const registered = new Set<string>()
let subscribed = false

/**
 * Listens to a hardware key. Each combination is registered natively once and never unregistered:
 * the library's unregister drops the key for every listener (and on iOS compares inputs by pointer),
 * so screens that come and go would break each other's shortcuts. A key without handlers does nothing.
 */
export function onKeyCommand(combo: KeyCombo, handler: KeyHandler): () => void {
  const id = comboId(combo)
  if (!subscribed) {
    subscribed = true
    eventEmitter.addListener('onKeyCommand', (event) => {
      stack.dispatch(comboId(event))
    })
  }
  if (!registered.has(id)) {
    registered.add(id)
    const input = {
      input: String(combo.input),
      ...(combo.modifierFlags ? { modifierFlags: combo.modifierFlags } : {}),
    }
    registerKeyCommands([input]).catch(() => registered.delete(id))
  }
  return stack.add(id, handler)
}

/**
 * `onKeyCommand` for a component: the latest `handler` runs, and the key is only taken while
 * `enabled`. Registered later than the shell's handlers, so it sees the key first.
 */
export function useKeyCommand(combo: KeyCombo, handler: KeyHandler, enabled = true): void {
  const latest = useRef(handler)
  latest.current = handler
  const id = comboId(combo)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the id stands for the combination.
  useEffect(() => {
    if (!enabled) return
    return onKeyCommand(combo, () => latest.current())
  }, [id, enabled])
}
