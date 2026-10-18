import { StyleSheet } from 'react-native'
import type { Theme } from './palettes'
import { selectTheme, useThemeStore } from './store'

/** The current theme; components re-render only when it changes. */
export function useTheme(): Theme {
  return useThemeStore(selectTheme)
}

/**
 * Styles that depend on the theme: `factory` runs once per theme (cached on the theme object) and
 * the returned hook gives the `StyleSheet` of the current one.
 *
 * ```ts
 * const useStyles = makeStyles((theme) => ({ card: { backgroundColor: theme.colors.surface } }))
 * const styles = useStyles()
 * ```
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>()
  return function useStyles(): T {
    const theme = useTheme()
    const cached = cache.get(theme)
    if (cached) return cached
    const styles = StyleSheet.create(factory(theme))
    cache.set(theme, styles)
    return styles
  }
}
