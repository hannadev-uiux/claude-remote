import { describe, expect, test } from 'vitest'
import { AGENT_COLORS, AGENT_IDS } from './agents'
import { ANSI_NAMES, DEFAULT_THEME, dark, latte, light, THEME_NAMES, THEMES, type Theme } from './palettes'

const HEX = /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/

/** Every token any theme defines: each theme must define all of them. */
const TOKENS = [...new Set(Object.values(THEMES).flatMap((theme) => Object.keys(theme.colors)))].sort()

/** WCAG 2 relative luminance of an opaque `#RRGGBB`. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** WCAG 2 contrast ratio between two opaque colors (1 to 21). */
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('palettes', () => {
  test('every theme is registered under its own name', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES].sort())
    for (const name of THEME_NAMES) expect(THEMES[name].name).toBe(name)
    expect(THEMES[DEFAULT_THEME]).toBe(dark)
  })

  test.each(THEME_NAMES)('%s defines every token with a valid color', (name) => {
    const theme: Theme = THEMES[name]
    expect(Object.keys(theme.colors).sort()).toEqual(TOKENS)
    for (const [token, value] of Object.entries(theme.colors)) expect(value, token).toMatch(HEX)
  })

  test.each(THEME_NAMES)('%s defines the 16 ANSI colors', (name) => {
    const { ansi } = THEMES[name]
    expect(Object.keys(ansi).sort()).toEqual([...ANSI_NAMES].sort())
    for (const [key, value] of Object.entries(ansi)) expect(value, key).toMatch(HEX)
  })

  test.each(THEME_NAMES)('%s body text meets WCAG AA and secondary text 3:1 on its surfaces', (name) => {
    const { colors } = THEMES[name]
    for (const surface of [colors.background, colors.surface, colors.surfaceRaised]) {
      expect(contrast(colors.text, surface), `text on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
    for (const surface of [colors.background, colors.surface]) {
      expect(contrast(colors.textMuted, surface), `textMuted on ${surface}`).toBeGreaterThanOrEqual(3)
      expect(contrast(colors.accentText, surface), `accentText on ${surface}`).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(colors.accentInk, colors.accent), 'accentInk on accent').toBeGreaterThanOrEqual(3)
  })

  test('dark keeps the terminal look with the amber accent and the new warning', () => {
    expect(dark.scheme).toBe('dark')
    expect(dark.colors.background).toBe('#0D0D0D')
    expect(dark.colors.text).toBe('#E8E6E3')
    expect(dark.colors.accent).toBe('#E8A33D')
    expect(dark.colors.accentText).toBe(dark.colors.accent)
    expect(dark.colors.warning).toBe('#F3DC7A')
    expect(dark.colors.accent).not.toBe(AGENT_COLORS.claude)
  })

  test('light themes darken the accent where it is text', () => {
    expect(light.scheme).toBe('light')
    expect(latte.scheme).toBe('light')
    expect(light.colors.accentText).toBe('#A0640A')
    expect(latte.colors.accentText).toBe('#D14F00')
    expect(THEMES.dracula.colors.accent).toBe('#BD93F9')
    expect(THEMES.mocha.colors.accent).toBe('#FAB387')
  })
})

describe('agent colors', () => {
  test('every agent has a fixed, distinct color', () => {
    expect(Object.keys(AGENT_COLORS).sort()).toEqual([...AGENT_IDS].sort())
    const values = Object.values(AGENT_COLORS)
    for (const value of values) expect(value).toMatch(HEX)
    expect(new Set(values).size).toBe(values.length)
    expect(AGENT_COLORS.claude).toBe('#D97757')
  })
})
