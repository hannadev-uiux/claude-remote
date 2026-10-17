import type { CommandItem } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import type { Messages } from '../../core/i18n/resources'

type BuiltinName = keyof Messages['autocomplete']['builtin']

/** Built-in commands come from the daemon in English; the app shows its own translation by name. */
export function commandDescription(item: CommandItem, t: TFunction): string | undefined {
  if (item.source === 'builtin' && item.name in BUILTIN_KEYS)
    return t(`autocomplete.builtin.${item.name as BuiltinName}`)
  return item.description
}

const BUILTIN_KEYS: Record<BuiltinName, true> = {
  clear: true,
  compact: true,
  context: true,
  cost: true,
  usage: true,
  init: true,
  review: true,
  memory: true,
  model: true,
  config: true,
  permissions: true,
  agents: true,
  mcp: true,
  resume: true,
  login: true,
  hooks: true,
  plugin: true,
  status: true,
  doctor: true,
  rewind: true,
  export: true,
  help: true,
  exit: true,
}
