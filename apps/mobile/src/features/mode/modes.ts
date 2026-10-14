import type { PermissionMode, SelectableMode } from '@claude-remote/protocol'

export const MODE_LABELS: Record<PermissionMode, string> = {
  default: 'padrão',
  acceptEdits: 'aceitar edições',
  plan: 'plano',
  auto: 'auto',
  dontAsk: 'não perguntar',
  bypassPermissions: 'bypass',
}

export const MODE_HINTS: Record<SelectableMode, string> = {
  default: 'pede permissão conforme as regras',
  acceptEdits: 'edições de arquivo sem perguntar',
  plan: 'só planeja, não executa',
  auto: 'decide sozinho o que é seguro',
}

/** Modes offered in the app. `bypassPermissions` is deliberately absent. */
export const SELECTABLE_MODES: SelectableMode[] = ['default', 'acceptEdits', 'plan', 'auto']
