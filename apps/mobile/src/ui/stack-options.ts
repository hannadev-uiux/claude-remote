import { fonts, type Theme } from '@/core/theme'

/** Native stack header and content colors of the current theme (shared by every navigator). */
export function stackScreenOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
    headerBackButtonDisplayMode: 'minimal' as const,
  }
}
