import { describe, expect, test } from 'vitest'
import { AGENT_COLORS, AGENT_IDS } from './agents'
import { ANSI_NAMES, DEFAULT_THEME, dark, THEME_NAMES, THEMES, type Theme } from './palettes'

const HEX = /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/

/** Every token any theme defines: each theme must define all of them. */
const TOKENS = [...new Set(Object.values(THEMES).flatMap((theme) => Object.keys(theme.colors)))].sort()

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

  test('dark keeps the terminal look with the amber accent and the new warning', () => {
    expect(dark.scheme).toBe('dark')
    expect(dark.colors.background).toBe('#0D0D0D')
    expect(dark.colors.text).toBe('#E8E6E3')
    expect(dark.colors.accent).toBe('#E8A33D')
    expect(dark.colors.accentText).toBe(dark.colors.accent)
    expect(dark.colors.warning).toBe('#F3DC7A')
    expect(dark.colors.accent).not.toBe(AGENT_COLORS.claude)
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
