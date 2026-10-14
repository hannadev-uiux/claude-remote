import { Fragment, memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useMarkdown } from 'react-native-marked'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'

const theme = {
  colors: { code: colors.surfaceRaised, link: colors.info, text: colors.text, border: colors.border },
  spacing: { xs: space.xs, s: space.sm, m: space.md, l: space.lg },
}

const markdownStyles = StyleSheet.create({
  text: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text, lineHeight: 21 },
  paragraph: { marginVertical: space.xs },
  strong: { fontFamily: fonts.bold },
  em: { fontFamily: fonts.italic },
  h1: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text },
  h3: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.text },
  codespan: { fontFamily: fonts.regular, color: colors.accent, backgroundColor: colors.surfaceRaised },
  code: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
  },
  codeText: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text },
  link: { color: colors.info, fontFamily: fonts.regular },
  blockquote: { borderLeftColor: colors.accent, borderLeftWidth: 3, paddingLeft: space.sm },
  li: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text },
  hr: { backgroundColor: colors.border },
  table: { borderColor: colors.border },
  tableCell: { padding: space.xs },
})

/** Markdown rendered with the terminal theme (react-native-marked). */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const elements = useMarkdown(text, { colorScheme: 'dark', theme, styles: markdownStyles })
  return (
    <View>
      {elements.map((element, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: markdown blocks have no stable id
        <Fragment key={index}>{element}</Fragment>
      ))}
    </View>
  )
})
