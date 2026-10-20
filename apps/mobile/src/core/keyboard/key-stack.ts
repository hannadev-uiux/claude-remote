/** A hardware key with its modifiers, as `react-native-key-command` reports it. */
export type KeyCombo = { input: string | number; modifierFlags?: number }

/** Returning `false` passes the key to the handler registered before this one. */
export type KeyHandler = () => unknown

/** Stable id of a combination: the input lowercased (as the native side reports it) and its flags. */
export function comboId(combo: KeyCombo): string {
  return `${String(combo.input).toLowerCase()}|${combo.modifierFlags ?? 0}`
}

/**
 * Handlers per key combination. The newest handler runs first and stops the key unless it returns
 * `false`, so a sheet or a focused field mounted on top of the shell sees Esc before "go back".
 */
export function createKeyStack() {
  const handlers = new Map<string, KeyHandler[]>()
  return {
    add(id: string, handler: KeyHandler): () => void {
      const list = handlers.get(id) ?? []
      list.push(handler)
      handlers.set(id, list)
      return () => {
        const current = handlers.get(id)
        const index = current?.lastIndexOf(handler) ?? -1
        if (current && index !== -1) current.splice(index, 1)
      }
    },
    /** Runs the handlers of `id`, newest first; `true` when one took the key. */
    dispatch(id: string): boolean {
      const list = [...(handlers.get(id) ?? [])]
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i]?.() !== false) return true
      }
      return false
    },
    has(id: string): boolean {
      return (handlers.get(id)?.length ?? 0) > 0
    },
  }
}
