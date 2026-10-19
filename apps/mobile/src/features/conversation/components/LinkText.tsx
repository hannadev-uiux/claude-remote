import { memo, type ReactNode, useMemo } from 'react'
import { Pressable, Text as RNText, StyleSheet, type TextStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { Text, type TextProps } from '@/ui'
import { useLinkHandlers } from '../link-menu'
import { splitLinks } from '../links'

/**
 * Nested link: tap opens web links (anything else shows the menu), long press shows the menu.
 * Must sit inside a non-selectable text: a selectable one keeps the touches for itself.
 */
export function LinkText({
  href,
  style,
  children,
}: {
  href: string
  style?: TextStyle
  children: ReactNode
}) {
  const { colors } = useTheme()
  const { onPress, onLongPress } = useLinkHandlers(href)
  return (
    <RNText
      accessibilityRole="link"
      onPress={onPress}
      onLongPress={onLongPress}
      style={[style, styles.link, { color: colors.info }]}
    >
      {children}
    </RNText>
  )
}

/** Linked markdown image: same tap and long-press behavior as `LinkText`. */
export function LinkImage({ href, children }: { href: string; children: ReactNode }) {
  const { onPress, onLongPress } = useLinkHandlers(href)
  return (
    <Pressable accessibilityRole="link" onPress={onPress} onLongPress={onLongPress}>
      {children}
    </Pressable>
  )
}

/** Plain text with its bare URLs as links; stays selectable only when it has none. */
export const LinkifiedText = memo(function LinkifiedText({
  children,
  selectable,
  ...props
}: Omit<TextProps, 'children'> & { children: string }) {
  const segments = useMemo(() => splitLinks(children), [children])
  const linked = segments.some((s) => s.kind === 'link')
  if (!linked) {
    return (
      <Text {...props} selectable={selectable}>
        {children}
      </Text>
    )
  }
  return (
    <Text {...props}>
      {segments.map((segment, index) =>
        segment.kind === 'link' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments of a fixed string
          <LinkText key={index} href={segment.href}>
            {segment.text}
          </LinkText>
        ) : (
          segment.text
        ),
      )}
    </Text>
  )
})

const styles = StyleSheet.create({ link: { textDecorationLine: 'underline' } })
