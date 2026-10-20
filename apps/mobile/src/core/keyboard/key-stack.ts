/** A hardware key with its modifiers, as `react-native-key-command` reports it. */
export type KeyCombo = { input: string | number; modifierFlags?: number }

/** Returning `false` passes the key to the handler registered before this one. */
export type KeyHandler = () => unknown

/**
 * `priority`: the key should reach the app even while a focused text view would use it itself
 * (Return, arrows, Tab on iOS). Ask for it only while the handler needs those keys.
 */
export type KeyOptions = { priority?: boolean }

/** Stable id of a combination: the input lowercased (as the native side reports it) and its flags. */
export function comboId(combo: KeyCombo): string {
  return `${String(combo.input).toLowerCase()}|${combo.modifierFlags ?? 0}`
}

/** What the native side should hold for a combination: nothing, or a command with or without priority. */
export type NativeState = 'none' | 'normal' | 'priority'

type Entry = { handler: KeyHandler; priority: boolean }

/**
 * Handlers per key combination. The newest handler runs first and stops the key unless it returns
 * `false`, so a sheet or a focused field mounted on top of the shell sees Esc before "go back".
 */
export function createKeyStack() {
  const handlers = new Map<string, Entry[]>()
  return {
    add(id: string, handler: KeyHandler, options: KeyOptions = {}): () => void {
      const entry: Entry = { handler, priority: options.priority === true }
      const list = handlers.get(id) ?? []
      list.push(entry)
      handlers.set(id, list)
      return () => {
        const current = handlers.get(id)
        const index = current?.indexOf(entry) ?? -1
        if (current && index !== -1) current.splice(index, 1)
      }
    },
    /** Runs the handlers of `id`, newest first; `true` when one took the key. */
    dispatch(id: string): boolean {
      const list = [...(handlers.get(id) ?? [])]
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i]?.handler() !== false) return true
      }
      return false
    },
    has(id: string): boolean {
      return (handlers.get(id)?.length ?? 0) > 0
    },
    /** Native registration the live handlers of `id` need. */
    nativeState(id: string): NativeState {
      const list = handlers.get(id) ?? []
      if (list.length === 0) return 'none'
      return list.some((entry) => entry.priority) ? 'priority' : 'normal'
    },
  }
}

/**
 * `true` for an event that repeats the previous one within `ms`: a command registered twice natively
 * (builds without the patched library) fires twice for one press.
 */
export function createDuplicateFilter(ms: number) {
  let last = { id: '', at: Number.NEGATIVE_INFINITY }
  return (id: string, now: number): boolean => {
    const duplicate = id === last.id && now - last.at < ms
    if (!duplicate) last = { id, at: now }
    return duplicate
  }
}
