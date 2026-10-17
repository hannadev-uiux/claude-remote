import type {
  PermissionAnswer,
  PermissionInteraction,
  PermissionRequestInfo,
  Question,
  QuestionKind,
} from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Decision } from './broker.ts'

/** Claude Code tools whose permission dialog is the menu the user answers. */
export const QUESTION_TOOL = 'AskUserQuestion'
export const PLAN_TOOL = 'ExitPlanMode'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)

function parseQuestion(value: unknown): Question | null {
  if (!isRecord(value)) return null
  const question = text(value.question)
  if (!question) return null
  const kind: QuestionKind = value.kind === 'text' || value.kind === 'number' ? value.kind : 'choice'
  const options = Array.isArray(value.options)
    ? value.options.flatMap((option) => {
        const label = isRecord(option) ? text(option.label) : null
        return label && isRecord(option) ? [{ label, description: text(option.description) }] : []
      })
    : []
  if (kind === 'choice' && options.length === 0) return null
  return { question, header: text(value.header), kind, options, multiSelect: value.multiSelect === true }
}

/** Structured menu content for `AskUserQuestion` / `ExitPlanMode`; null for other tools or bad input. */
export function parseInteraction(tool: string, input: Record<string, unknown>): PermissionInteraction | null {
  if (tool === PLAN_TOOL) return { kind: 'plan', plan: text(input.plan) }
  if (tool !== QUESTION_TOOL || !Array.isArray(input.questions)) return null
  const questions = input.questions.map(parseQuestion)
  if (questions.length === 0 || questions.some((q) => q === null)) return null
  return { kind: 'question', title: text(input.title), questions: questions as Question[] }
}

/** Turns the phone's answer into the hook decision for the pending interactive request. */
export function answerDecision(
  info: PermissionRequestInfo,
  answer: PermissionAnswer,
  keepPlanningMessage: string,
): Decision {
  if (info.interaction?.kind !== answer.kind)
    throw new DaemonError('bad_request', 'answer does not match the request')
  if (answer.kind === 'question') {
    const asked = new Set(
      info.interaction.kind === 'question' ? info.interaction.questions.map((q) => q.question) : [],
    )
    const answers = Object.fromEntries(
      Object.entries(answer.answers).filter(
        ([question, value]) => asked.has(question) && value.trim() !== '',
      ),
    )
    if (Object.keys(answers).length === 0) throw new DaemonError('bad_request', 'no answer')
    return { behavior: 'allow', updatedInput: { ...info.input, answers } }
  }
  if (answer.decision === 'keepPlanning')
    return { behavior: 'deny', message: answer.feedback?.trim() || keepPlanningMessage }
  return { behavior: 'allow', mode: answer.decision }
}
