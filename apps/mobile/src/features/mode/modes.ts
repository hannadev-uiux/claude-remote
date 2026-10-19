import type { SelectableMode } from '@remote-harness/protocol'

// Labels and hints live in the catalogs: `mode.labels.<mode>` and `mode.hints.<mode>`.

/** Modes offered in the app. `bypassPermissions` is deliberately absent. */
export const SELECTABLE_MODES: SelectableMode[] = ['default', 'acceptEdits', 'plan', 'auto']

/** Agents whose permission mode the app can switch (Claude Code's Shift+Tab cycle). */
export function hasSwitchableModes(agent: string | null): boolean {
  return agent === null || agent === 'claude'
}

export type PolicyTone = 'danger' | 'accent' | 'muted'

/** Codex approval policy chip: `never` runs everything without asking, `on-request` is the default. */
export function approvalPolicyTone(policy: string | null): PolicyTone {
  if (policy === 'never') return 'danger'
  if (policy === 'on-request' || policy === 'on-failure') return 'accent'
  return 'muted'
}
