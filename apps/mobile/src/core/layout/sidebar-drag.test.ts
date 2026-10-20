import { describe, expect, test } from 'vitest'
import { dragProgress, edgeSwipeEnabled, settlesOpen } from './sidebar-drag'

describe('sidebar drag', () => {
  test('progress follows the finger from where the drag started, within 0..1', () => {
    expect(dragProgress(0, 170, 340)).toBe(0.5)
    expect(dragProgress(0, -40, 340)).toBe(0)
    expect(dragProgress(0, 500, 340)).toBe(1)
    expect(dragProgress(1, -85, 340)).toBe(0.75)
    expect(dragProgress(1, 0, 0)).toBe(1)
  })

  test('a flick decides; otherwise the sidebar stays open from half its width', () => {
    expect(settlesOpen(250 / 340, 0)).toBe(true)
    expect(settlesOpen(100 / 340, 100)).toBe(false)
    expect(settlesOpen(0.2, 900)).toBe(true)
    expect(settlesOpen(0.9, -900)).toBe(false)
    expect(settlesOpen(0.5, 0)).toBe(true)
  })

  test('only the closed overlay sidebar, on the list or a conversation, gets the edge swipe', () => {
    expect(edgeSwipeEnabled('overlay', false, '/')).toBe(true)
    expect(edgeSwipeEnabled('overlay', false, '/session/abc')).toBe(true)
    expect(edgeSwipeEnabled('overlay', true, '/session/abc')).toBe(false)
    expect(edgeSwipeEnabled('overlay', false, '/session/abc/terminal')).toBe(false)
    expect(edgeSwipeEnabled('overlay', false, '/session/abc/agent/a1')).toBe(false)
    expect(edgeSwipeEnabled('overlay', false, '/settings')).toBe(false)
    expect(edgeSwipeEnabled('inline', false, '/')).toBe(false)
    expect(edgeSwipeEnabled('none', false, '/session/abc')).toBe(false)
  })
})
