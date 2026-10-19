import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import {
  clampInspectorWidth,
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_MAX_WIDTH,
  INSPECTOR_MIN_WIDTH,
  inspectorTabLabel,
  resizedInspectorWidth,
} from './logic'

const en = createI18n('en-US').t

test('the inspector width stays between its bounds', () => {
  expect(clampInspectorWidth(100)).toBe(INSPECTOR_MIN_WIDTH)
  expect(clampInspectorWidth(999)).toBe(INSPECTOR_MAX_WIDTH)
  expect(clampInspectorWidth(333.6)).toBe(334)
  // Dragging the left edge 200 points to the left from the default width hits the maximum.
  expect(resizedInspectorWidth(INSPECTOR_DEFAULT_WIDTH, -200)).toBe(INSPECTOR_MAX_WIDTH)
  expect(resizedInspectorWidth(INSPECTOR_DEFAULT_WIDTH, 20)).toBe(300)
})

test('tab labels carry the subagent count', () => {
  expect(inspectorTabLabel('terminal', 3, en)).toBe('Terminal')
  expect(inspectorTabLabel('subagents', 0, en)).toBe('Subagents')
  expect(inspectorTabLabel('subagents', 3, en)).toBe('Subagents (3)')
  expect(inspectorTabLabel('details', 3, en)).toBe('Details')
})
