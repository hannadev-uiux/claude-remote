import type { SelectableMode } from '@remote-harness/protocol'

// Labels and hints live in the catalogs: `mode.labels.<mode>` and `mode.hints.<mode>`.

/** Modes offered in the app. `bypassPermissions` is deliberately absent. */
export const SELECTABLE_MODES: SelectableMode[] = ['default', 'acceptEdits', 'plan', 'auto']
