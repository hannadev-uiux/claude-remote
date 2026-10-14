import type { CommandItem, Profile } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { commandsSignature, loadCommands } from './commands.ts'
import { FileIndex } from './file-index.ts'

const COMMANDS_TTL_MS = 60_000

export function registerAutocompleteFeature(ctx: DaemonContext, store: SessionStore) {
  const files = new FileIndex(ctx.exec)
  const commandCache = new Map<string, { at: number; signature: string; items: CommandItem[] }>()

  function sessionContext(sessionId: string): { cwd: string; profile: Profile } {
    const session = store.get(sessionId)
    if (!session?.cwd) throw new DaemonError('not_found', `session ${sessionId} not found`)
    const profile = ctx.profiles.find((p) => p.id === session.profileId)
    if (!profile) throw new DaemonError('not_found', `profile ${session.profileId} not found`)
    return { cwd: session.cwd, profile }
  }

  ctx.router.register('files.search', async (msg) => {
    const { cwd } = sessionContext(msg.sessionId)
    return { type: 'files.results', query: msg.query, items: await files.search(cwd, msg.query, msg.limit) }
  })

  ctx.router.register('commands.list', async (msg) => {
    const { cwd, profile } = sessionContext(msg.sessionId)
    const key = `${profile.id}:${cwd}`
    const cached = commandCache.get(key)
    // Directory mtimes catch new skills/commands immediately; the TTL covers nested edits.
    const signature = await commandsSignature(profile.configDir, cwd)
    if (cached && cached.signature === signature && Date.now() - cached.at < COMMANDS_TTL_MS) {
      return { type: 'commands.results', items: cached.items }
    }
    const items = await loadCommands(profile.configDir, cwd)
    commandCache.set(key, { at: Date.now(), signature, items })
    return { type: 'commands.results', items }
  })

  return { files }
}
