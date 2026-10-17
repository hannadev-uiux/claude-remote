import type { Question } from '@remote-harness/protocol'

/** What the user picked for one question: option labels plus the free-text "Other". */
export type Selection = { picked: string[]; other: string }

export const EMPTY_SELECTION: Selection = { picked: [], other: '' }

/** Single choice replaces the pick and clears "Other"; multiple choice toggles the label. */
export function toggleOption(selection: Selection, label: string, multiSelect: boolean): Selection {
  if (!multiSelect) return { picked: [label], other: '' }
  const picked = selection.picked.includes(label)
    ? selection.picked.filter((l) => l !== label)
    : [...selection.picked, label]
  return { ...selection, picked }
}

/** Typing in "Other" replaces the single choice; with multiple choice it adds to the picks. */
export function setOther(selection: Selection, other: string, multiSelect: boolean): Selection {
  if (multiSelect || other.trim() === '') return { ...selection, other }
  return { picked: [], other }
}

/** The answer Claude Code expects: labels in option order, then "Other", joined with ", ". */
export function answerFor(question: Question, selection: Selection): string | null {
  const other = selection.other.trim()
  if (question.kind !== 'choice') return other || null
  const picked = question.options.map((o) => o.label).filter((label) => selection.picked.includes(label))
  const parts = other ? [...picked, other] : picked
  return parts.length > 0 ? parts.join(', ') : null
}

export function buildAnswers(
  questions: readonly Question[],
  selections: Readonly<Record<string, Selection>>,
): Record<string, string> {
  const answers: Record<string, string> = {}
  for (const question of questions) {
    const answer = answerFor(question, selections[question.question] ?? EMPTY_SELECTION)
    if (answer) answers[question.question] = answer
  }
  return answers
}

export function isAnswerComplete(
  questions: readonly Question[],
  selections: Readonly<Record<string, Selection>>,
): boolean {
  return Object.keys(buildAnswers(questions, selections)).length === questions.length
}
