import { describe, expect, test } from 'vitest'
import {
  getLayoutClass,
  getWidthClass,
  inspectorMode,
  REGULAR_WIDTH_BREAKPOINT,
  sidebarMode,
  WIDE_WIDTH_BREAKPOINT,
} from './width-class'

describe('getWidthClass', () => {
  test('iPhone width is compact', () => {
    expect(getWidthClass(390)).toBe('compact')
  })

  test('narrow Split View and Slide Over are compact', () => {
    expect(getWidthClass(320)).toBe('compact')
    expect(getWidthClass(REGULAR_WIDTH_BREAKPOINT - 1)).toBe('compact')
  })

  test('iPad mini portrait is regular, the breakpoint included', () => {
    expect(getWidthClass(744)).toBe('regular')
    expect(getWidthClass(REGULAR_WIDTH_BREAKPOINT)).toBe('regular')
  })
})

describe('getLayoutClass', () => {
  test('phone, two columns, three columns', () => {
    expect(getLayoutClass(390)).toBe('compact')
    expect(getLayoutClass(820)).toBe('regular')
    expect(getLayoutClass(WIDE_WIDTH_BREAKPOINT - 1)).toBe('regular')
    expect(getLayoutClass(WIDE_WIDTH_BREAKPOINT)).toBe('wide')
    expect(getLayoutClass(1180)).toBe('wide')
  })
})

describe('pane modes', () => {
  test('the sidebar slides over the conversation only on two-column portrait', () => {
    expect(sidebarMode('compact', true)).toBe('none')
    expect(sidebarMode('regular', false)).toBe('inline')
    expect(sidebarMode('regular', true)).toBe('overlay')
    expect(sidebarMode('wide', true)).toBe('inline')
  })

  test('the inspector is a column when wide, a sheet on two columns, absent on phones', () => {
    expect(inspectorMode('wide')).toBe('inline')
    expect(inspectorMode('regular')).toBe('overlay')
    expect(inspectorMode('compact')).toBe('none')
  })
})
