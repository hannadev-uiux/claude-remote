import type { TFunction } from '../i18n/create'
import { DaemonRequestError } from './daemon-client'

/**
 * User-facing text for a failed request: `byCode` overrides per error code, then the local
 * `disconnected`/`timeout` errors, then the daemon's own message.
 */
export function errorMessage(
  error: unknown,
  t: TFunction,
  byCode: Partial<Record<DaemonRequestError['code'], string>> = {},
): string {
  if (error instanceof DaemonRequestError) {
    const custom = byCode[error.code]
    if (custom) return custom
    if (error.code === 'disconnected') return t('errors.disconnected')
    if (error.code === 'timeout') return t('errors.timeout')
    if (error.code === 'invalid_cwd') return t('errors.invalidCwd')
    if (error.code === 'not_found') return t('errors.notFound')
    return error.message
  }
  return error instanceof Error ? error.message : String(error)
}
