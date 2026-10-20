import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ConfigSchema, defaultProfiles, hookTimeoutSec } from '../src/core/config.ts'
import { PermissionBroker } from '../src/features/permissions/broker.ts'
import {
  entryMovesOn,
  HANDOVER_GRACE_MS,
  handoverDelay,
  handoverOutcome,
  hookMovesOn,
  QUESTION_REMINDER_MS,
  reminderDelay,
  timeoutFor,
} from '../src/features/permissions/handover.ts'
import { hookEvent } from './helpers.ts'

const question = { interaction: { kind: 'question' as const, title: null, questions: [] } }

describe('handover rules', () => {
  test('questions and plans wait for their own timeout', () => {
    const timeouts = { permissionMs: 280_000, questionMs: 3_300_000 }
    expect(timeoutFor({}, timeouts)).toBe(280_000)
    expect(timeoutFor(question, timeouts)).toBe(3_300_000)
    expect(timeoutFor({ interaction: { kind: 'plan', plan: null } }, timeouts)).toBe(3_300_000)
  })

  test('our timeout hands over at once; an abort after the grace, as cancelled', () => {
    expect(handoverDelay('expired')).toBe(0)
    expect(handoverDelay('aborted')).toBe(HANDOVER_GRACE_MS)
    expect(handoverOutcome('expired')).toBe('expired')
    expect(handoverOutcome('aborted')).toBe('cancelled')
  })

  test('what shows the session went past the dialog', () => {
    expect(entryMovesOn({ kind: 'tool_result' })).toBe(true)
    expect(entryMovesOn({ kind: 'user' })).toBe(true)
    expect(entryMovesOn({ kind: 'tool_use' })).toBe(false)
    expect(entryMovesOn({ kind: 'assistant_text' })).toBe(false)
    expect(hookMovesOn('Stop')).toBe(true)
    expect(hookMovesOn('UserPromptSubmit')).toBe(true)
    expect(hookMovesOn('SessionEnd')).toBe(true)
    expect(hookMovesOn('Notification')).toBe(false)
  })

  test('only questions and plans with a long wait get a reminder', () => {
    expect(reminderDelay({}, 3_300_000)).toBeNull()
    expect(reminderDelay(question, 3_300_000)).toBe(QUESTION_REMINDER_MS)
    expect(reminderDelay(question, QUESTION_REMINDER_MS)).toBeNull()
  })

  test('the hook timeout covers both waits', () => {
    const defaults = ConfigSchema.parse({ profiles: defaultProfiles('en-US') })
    expect(hookTimeoutSec(defaults)).toBe(3320)
    expect(
      hookTimeoutSec({ hookPermissionTimeoutSec: 300, permissionTimeoutSec: 280, questionTimeoutSec: 100 }),
    ).toBe(300)
    expect(
      hookTimeoutSec({ hookPermissionTimeoutSec: 300, permissionTimeoutSec: 600, questionTimeoutSec: 100 }),
    ).toBe(620)
  })
})

describe('question reminder', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('one reminder while the question is open, none once answered', async () => {
    vi.useFakeTimers()
    const reminders: string[] = []
    const sent: ServerMessage[] = []
    const broker = new PermissionBroker(
      { broadcast: (m) => sent.push(m) },
      {
        timeoutMs: 1_000,
        questionTimeoutMs: 3_300_000,
        defaultScope: 'project',
        profiles: [{ id: 'claudin', name: 'P', configDir: '/cfg', color: '' }],
        denyMessage: 'no',
        keepPlanningMessage: 'plan',
        onReminder: (info) => reminders.push(info.requestId),
      },
    )
    const ask = () =>
      broker.handle(
        hookEvent('PermissionRequest', {
          session_id: 's',
          tool_name: 'AskUserQuestion',
          tool_input: { questions: [{ question: 'Which?', options: [{ label: 'A' }] }] },
        }),
        new AbortController().signal,
      )
    const first = ask()
    await vi.advanceTimersByTimeAsync(QUESTION_REMINDER_MS)
    expect(reminders).toHaveLength(1)
    const firstId = (sent[0] as Extract<ServerMessage, { type: 'permission.request' }>).request.requestId
    broker.answer(firstId, { kind: 'question', answers: { 'Which?': 'A' } })
    await first
    const second = ask()
    const secondId = (sent.at(-1) as Extract<ServerMessage, { type: 'permission.request' }>).request.requestId
    broker.answer(secondId, { kind: 'question', answers: { 'Which?': 'A' } })
    await second
    await vi.advanceTimersByTimeAsync(QUESTION_REMINDER_MS * 2)
    expect(reminders).toEqual([firstId])
  })
})
