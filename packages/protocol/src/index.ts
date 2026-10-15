export const PROTOCOL_VERSION = 1
/**
 * Oldest daemon whose features this app version relies on; older ones still connect (same
 * protocol) but the app suggests `claude-remote update`. Raise it with the features that need it.
 */
export const MIN_DAEMON_VERSION = '0.3.0'

export * from './client.ts'
export * from './domain.ts'
export * from './locale.ts'
export * from './parse.ts'
export * from './server.ts'
