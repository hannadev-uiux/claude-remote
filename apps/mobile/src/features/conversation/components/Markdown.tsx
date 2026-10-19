import { Fragment, isValidElement, memo, type ReactNode, useMemo } from 'react'
import {
  type ImageStyle,
  Text as RNText,
  ScrollView,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native'
import { MarkedTokenizer, Renderer, useMarkdown } from 'react-native-marked'
import { fontSize, fonts, radius, space, type Theme, useTheme } from '@/core/theme'
import { hasLinks, splitLinks, tagLinkTarget } from '../links'
import { LinkImage, LinkText } from './LinkText'

function markedOptions(theme: Theme) {
  const { colors } = theme
  return {
    theme: {
      colors: { code: colors.surfaceRaised, link: colors.info, text: colors.text, border: colors.border },
      spacing: { xs: space.xs, s: space.sm, m: space.md, l: space.lg },
    },
    styles: StyleSheet.create({
      text: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text, lineHeight: 21 },
      paragraph: { marginVertical: space.xs },
      strong: { fontFamily: fonts.bold },
      em: { fontFamily: fonts.italic },
      h1: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text },
      h2: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text },
      h3: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.text },
      codespan: {
        fontFamily: fonts.regular,
        color: colors.accentText,
        backgroundColor: colors.surfaceRaised,
      },
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
    }),
  }
}

/** Built once per theme: `useMarkdown` re-parses when its options change. */
const cache = new WeakMap<Theme, ReturnType<typeof markedOptions>>()
function optionsFor(theme: Theme) {
  const cached = cache.get(theme)
  if (cached) return cached
  const options = markedOptions(theme)
  cache.set(theme, options)
  return options
}

/** Keeps markdown link targets without a scheme (file paths) as written; see `tagLinkTarget`. */
class PathTokenizer extends MarkedTokenizer {
  override link(src: string) {
    const token = super.link(src)
    if (token?.type === 'link') token.href = tagLinkTarget(token.href)
    return token
  }

  override reflink(src: string, links: Parameters<MarkedTokenizer['reflink']>[1]) {
    const token = super.reflink(src, links)
    if (token?.type === 'link') token.href = tagLinkTarget(token.href)
    return token
  }
}

const tokenizer = new PathTokenizer()

/** Whether a rendered node has a link inside: its root text must not be selectable. */
function containsLink(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(containsLink)
  if (!isValidElement(node)) return false
  if (node.type === LinkText || node.type === LinkImage) return true
  return containsLink((node.props as { children?: ReactNode }).children)
}

/** Bare URLs of a code text as links (marked only autolinks outside code). */
function linkify(text: string): ReactNode[] {
  return splitLinks(text).map((segment, index) =>
    segment.kind === 'link' ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: segments of a fixed string
      <LinkText key={index} href={segment.href}>
        {segment.text}
      </LinkText>
    ) : (
      segment.text
    ),
  )
}

/**
 * Links that open on tap and show a menu on long press. A text block is selectable only without
 * links: a selectable native text keeps the touches for itself and its links would never fire.
 */
class LinkRenderer extends Renderer {
  override link(children: string | ReactNode[], href: string, styles?: TextStyle): ReactNode {
    return (
      <LinkText key={this.getKey()} href={href} style={styles}>
        {children}
      </LinkText>
    )
  }

  override linkImage(
    href: string,
    imageUrl: string,
    alt?: string,
    style?: ImageStyle,
    title?: string,
  ): ReactNode {
    return (
      <LinkImage key={this.getKey()} href={href}>
        {this.image(imageUrl, alt, style, title)}
      </LinkImage>
    )
  }

  override text(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.block(text, styles)
  }

  override heading(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.block(text, styles)
  }

  override codespan(text: string, styles?: TextStyle): ReactNode {
    return this.block(hasLinks(text) ? linkify(text) : text, styles)
  }

  override code(
    text: string,
    _language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ): ReactNode {
    return (
      <ScrollView horizontal key={this.getKey()} contentContainerStyle={containerStyle}>
        {/* The View avoids "Cannot add a child that doesn't have a YogaNode" (react-native#18773). */}
        <View>{this.block(hasLinks(text) ? linkify(text) : text, textStyle)}</View>
      </ScrollView>
    )
  }

  private block(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return (
      <RNText key={this.getKey()} selectable={!containsLink(children)} style={styles}>
        {children}
      </RNText>
    )
  }
}

/** Markdown rendered with the terminal theme (react-native-marked). */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const theme = useTheme()
  const options = optionsFor(theme)
  // One per message: the renderer's key generator remembers every key it handed out.
  const renderer = useMemo(() => new LinkRenderer(), [])
  const elements = useMarkdown(text, {
    colorScheme: theme.scheme,
    theme: options.theme,
    styles: options.styles,
    renderer,
    tokenizer,
  })
  return (
    <View>
      {elements.map((element, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: markdown blocks have no stable id
        <Fragment key={index}>{element}</Fragment>
      ))}
    </View>
  )
})
