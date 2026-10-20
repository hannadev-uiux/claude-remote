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
  'add-dir': true,
  branch: true,
  btw: true,
  clear: true,
  compact: true,
  config: true,
  context: true,
  copy: true,
  diff: true,
  doctor: true,
  effort: true,
  exit: true,
  export: true,
  fast: true,
  fork: true,
  goal: true,
  help: true,
  hooks: true,
  ide: true,
  init: true,
  insights: true,
  login: true,
  mcp: true,
  memory: true,
  model: true,
  'output-style': true,
  permissions: true,
  plan: true,
  plugin: true,
  'privacy-settings': true,
  recap: true,
  'release-notes': true,
  'reload-plugins': true,
  'reload-skills': true,
  rename: true,
  resume: true,
  rewind: true,
  sandbox: true,
  'security-review': true,
  skills: true,
  status: true,
  statusline: true,
  tasks: true,
  theme: true,
  usage: true,
  version: true,
}
