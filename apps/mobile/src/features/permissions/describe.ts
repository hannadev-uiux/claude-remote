import type { PermissionRequestInfo, RuleScope } from '@remote-harness/protocol'
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

/**
 * What a request handed over to the terminal still shows: its title and a plain summary (the
 * questions, the plan or the tool call's detail). `questionTitle` is the default question title.
 */
export function handoverSummary(
  info: Pick<PermissionRequestInfo, 'tool' | 'input' | 'interaction'>,
  t: TFunction,
  questionTitle: string,
): { title: string; detail: string } {
  const interaction = info.interaction
  if (interaction?.kind === 'question')
    return {
      title: interaction.title ?? questionTitle,
      detail: interaction.questions.map((q) => q.question).join('\n'),
    }
  if (interaction?.kind === 'plan')
    return { title: t('permissions.plan.title'), detail: interaction.plan ?? t('permissions.plan.empty') }
  const { title, detail } = describePermission(info, t)
  return { title, detail }
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

/** How long a request has been waiting, and whether it is about to expire (under 30 s left). */
export function permissionTimer(
  createdAt: string,
  expiresAt: string,
  now: number = Date.now(),
): { elapsedMs: number; urgent: boolean } {
  const created = Date.parse(createdAt)
  return {
    elapsedMs: Number.isNaN(created) ? 0 : Math.max(0, now - created),
    urgent: secondsLeft(expiresAt, now) < 30,
  }
}
