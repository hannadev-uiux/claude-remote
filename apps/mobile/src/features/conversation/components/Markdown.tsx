import { Fragment, isValidElement, memo, type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Text } from '@/ui'
import { codeLabel, plainText } from '../copy'
import { copyText } from '../copy-text'
import { hasLinks, splitLinks, tagLinkTarget } from '../links'
import { CopyButton } from './CopyButton'
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

/** Inline code: a tap or a long press copies it. */
function CodeSpan({ code, style }: { code: string; style?: TextStyle }) {
  const { t } = useTranslation()
  const copy = () => void copyText(code, t('conversation.copy.copied'), { toast: true })
  return (
    <RNText accessibilityHint={t('conversation.copy.inline')} onPress={copy} onLongPress={copy} style={style}>
      {code}
    </RNText>
  )
}

/** Root text of a block with tappable spans: not selectable, so a long press copies the whole block. */
function CopyableBlock({ style, children }: { style?: TextStyle; children: string | ReactNode[] }) {
  const { t } = useTranslation()
  const copy = () => void copyText(plainText(children), t('conversation.copy.copied'), { toast: true })
  return (
    <RNText onLongPress={copy} style={style}>
      {children}
    </RNText>
  )
}

/** Fenced code block: header with the language and a Copy button over the scrolling code. */
function CodeBlock({
  code,
  language,
  style,
  children,
}: {
  code: string
  language?: string
  style?: ViewStyle
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <View style={style}>
      <View style={local.codeHeader}>
        <Text size="xs" color="textDim">
          {codeLabel(language) ?? ''}
        </Text>
        <CopyButton value={code} label={t('conversation.copy.code')} />
      </View>
      <ScrollView horizontal>
        {/* The View avoids "Cannot add a child that doesn't have a YogaNode" (react-native#18773). */}
        <View>{children}</View>
      </ScrollView>
    </View>
  )
}

/** Whether a rendered node has a link or inline code inside: its root text must not be selectable. */
function containsPressable(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(containsPressable)
  if (!isValidElement(node)) return false
  if (node.type === LinkText || node.type === LinkImage || node.type === CodeSpan) return true
  return containsPressable((node.props as { children?: ReactNode }).children)
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
 * Links that open on tap and show a menu on long press, inline code that copies on tap, code blocks
 * with a Copy button. A text block is selectable only without links or inline code: a selectable
 * native text keeps the touches for itself and they would never fire.
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
    // Code with links keeps the links' behavior.
    if (hasLinks(text)) return this.block(linkify(text), styles)
    return <CodeSpan key={this.getKey()} code={text} style={styles} />
  }

  override code(
    text: string,
    language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ): ReactNode {
    return (
      <CodeBlock key={this.getKey()} code={text} language={language} style={containerStyle}>
        {this.block(hasLinks(text) ? linkify(text) : text, textStyle)}
      </CodeBlock>
    )
  }

  private block(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    if (containsPressable(children)) {
      return (
        <CopyableBlock key={this.getKey()} style={styles}>
          {children}
        </CopyableBlock>
      )
    }
    return (
      <RNText key={this.getKey()} selectable style={styles}>
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

const local = StyleSheet.create({
  codeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
