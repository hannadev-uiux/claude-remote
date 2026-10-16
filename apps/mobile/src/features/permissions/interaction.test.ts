import type { Question } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import {
  answerFor,
  buildAnswers,
  EMPTY_SELECTION,
  isAnswerComplete,
  setOther,
  toggleOption,
} from './interaction'

const choice = (multiSelect: boolean): Question => ({
  question: 'Tests?',
  header: null,
  kind: 'choice',
  options: [
    { label: 'Unit', description: null },
    { label: 'E2E', description: null },
  ],
  multiSelect,
})
const text: Question = { question: 'Name?', header: null, kind: 'text', options: [], multiSelect: false }

describe('selections', () => {
  test('single choice keeps one pick and "Other" replaces it', () => {
    let s = toggleOption(EMPTY_SELECTION, 'Unit', false)
    s = toggleOption(s, 'E2E', false)
    expect(s).toEqual({ picked: ['E2E'], other: '' })
    s = setOther(s, 'smoke', false)
    expect(s).toEqual({ picked: [], other: 'smoke' })
    expect(toggleOption(s, 'Unit', false)).toEqual({ picked: ['Unit'], other: '' })
  })

  test('multiple choice toggles and adds "Other"', () => {
    let s = toggleOption(EMPTY_SELECTION, 'E2E', true)
    s = toggleOption(s, 'Unit', true)
    s = setOther(s, ' smoke ', true)
    expect(answerFor(choice(true), s)).toBe('Unit, E2E, smoke')
    expect(answerFor(choice(true), toggleOption(s, 'Unit', true))).toBe('E2E, smoke')
  })
})

describe('answers', () => {
  test('only answered questions are sent; complete when all have one', () => {
    const questions = [choice(false), text]
    const selections = { 'Tests?': toggleOption(EMPTY_SELECTION, 'Unit', false) }
    expect(buildAnswers(questions, selections)).toEqual({ 'Tests?': 'Unit' })
    expect(isAnswerComplete(questions, selections)).toBe(false)
    const all = { ...selections, 'Name?': setOther(EMPTY_SELECTION, 'api', false) }
    expect(buildAnswers(questions, all)).toEqual({ 'Tests?': 'Unit', 'Name?': 'api' })
    expect(isAnswerComplete(questions, all)).toBe(true)
  })

  test('blank text is no answer', () => {
    expect(answerFor(text, setOther(EMPTY_SELECTION, '   ', false))).toBeNull()
  })
})
