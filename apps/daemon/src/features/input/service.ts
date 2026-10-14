import { KeySchema } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { SessionRecord } from '../sessions/types.ts'

export const MAX_INPUT_BYTES = 100 * 1024

export type InputOptions = {
  strategy: 'paste' | 'type'
  pasteEnterDelayMs: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Resolves a session that can receive input, or throws the matching protocol error. */
export function requireControllable(
  store: SessionStore,
  sessionId: string,
): SessionRecord & { paneId: string } {
  const session = store.get(sessionId)
  if (!session) throw new DaemonError('not_found', `session ${sessionId} not found`)
  if (!session.controllable || !session.paneId) {
    throw new DaemonError('not_controllable', 'session has no live tmux pane')
  }
  return session as SessionRecord & { paneId: string }
}

/** Delivers prompts and keys to a session's tmux pane as if typed on the Mac. */
export class InputService {
  private bufferSeq = 0
  private readonly sleep: (ms: number) => Promise<void>

  constructor(
    private readonly tmux: TmuxClient,
    private readonly store: SessionStore,
    private readonly lock: KeyedMutex,
    private readonly options: InputOptions,
  ) {
    this.sleep = options.sleep ?? defaultSleep
  }

  async sendText(sessionId: string, text: string): Promise<void> {
    if (Buffer.byteLength(text, 'utf8') > MAX_INPUT_BYTES)
      throw new DaemonError('too_large', 'prompt exceeds 100 KB')
    const { paneId } = requireControllable(this.store, sessionId)
    await this.lock.run(sessionId, async () => {
      if (this.options.strategy === 'paste') {
        // Pasting avoids the TUI reacting to `@`/`/` while typing and keeps multi-line prompts intact.
        const buffer = `cr-${sessionId.slice(0, 8)}-${++this.bufferSeq}`
        await this.tmux.pasteText(paneId, text, buffer)
      } else {
        const lines = text.split('\n')
        for (const [i, line] of lines.entries()) {
          if (line) await this.tmux.sendLiteral(paneId, line)
          // Claude Code inserts a newline for backslash + Enter.
          if (i < lines.length - 1)
            await this.tmux.sendLiteral(paneId, '\\').then(() => this.tmux.sendKeys(paneId, ['Enter']))
        }
        // Close any autocomplete menu opened while typing so Enter submits.
        await this.tmux.sendKeys(paneId, ['Escape'])
      }
      await this.sleep(this.options.pasteEnterDelayMs)
      await this.tmux.sendKeys(paneId, ['Enter'])
    })
  }

  async sendKey(sessionId: string, key: string): Promise<void> {
    const parsed = KeySchema.safeParse(key)
    if (!parsed.success) throw new DaemonError('invalid_key', `key not allowed: ${key}`)
    const { paneId } = requireControllable(this.store, sessionId)
    await this.lock.run(sessionId, () => this.tmux.sendKeys(paneId, [parsed.data]))
  }
}
