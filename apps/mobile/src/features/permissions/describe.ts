import type { PermissionRequestInfo, RuleScope } from '@claude-remote/protocol'
import type { TFunction } from '@/core/i18n/create'
import { summarizeTool } from '../conversation/summarize-tool'

export type PermissionDescription = { title: string; detail: string; detailLabel: string }

/** Human-readable view of what the tool wants to do, with the full command or path. */
export function describePermission(
  info: Pick<PermissionRequestInfo, 'tool' | 'input'>,
  t: TFunction,
): PermissionDescription {
  const { tool, input } = info
  const title = summarizeTool(tool, input, t)
  if (typeof input.command === 'string')
    return { title, detail: input.command, detailLabel: t('permissions.detail.command') }
  const path = input.file_path ?? input.notebook_path ?? input.path
  if (typeof path === 'string') return { title, detail: path, detailLabel: t('permissions.detail.file') }
  if (typeof input.url === 'string')
    return { title, detail: input.url, detailLabel: t('permissions.detail.url') }
  return { title, detail: JSON.stringify(input, null, 2), detailLabel: t('permissions.detail.input') }
}

export type RespondPayload = {
  type: 'permission.respond'
  requestId: string
  decision: 'allow' | 'deny'
  always?: { rule: string; scope: RuleScope }
}

export function buildRespond(
  requestId: string,
  decision: 'allow' | 'deny',
  always?: { rule: string; scope: RuleScope },
): RespondPayload {
  const rule = always?.rule.trim()
  return decision === 'allow' && always && rule
    ? { type: 'permission.respond', requestId, decision, always: { rule, scope: always.scope } }
    : { type: 'permission.respond', requestId, decision }
}

export function secondsLeft(expiresAt: string, now: number = Date.now()): number {
  return Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000))
}
