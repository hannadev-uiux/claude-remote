import { Search, X } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, TextInput, View } from 'react-native'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { useSearchFocus } from '../search-focus'

/**
 * Search field above the session list (title and folder); ⌘K focuses it through `requestSearchFocus`.
 * `focusable` false for a copy currently hidden behind the collapsing header's compact bar, so a
 * focus request cannot land on an invisible field.
 */
export function SessionSearch({
  value,
  onChange,
  focusable = true,
}: {
  value: string
  onChange: (value: string) => void
  focusable?: boolean
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const input = useRef<TextInput>(null)
  const requests = useSearchFocus((s) => s.requests)
  useEffect(() => {
    if (requests > 0 && focusable) input.current?.focus()
  }, [requests, focusable])
  return (
    <View style={styles.box}>
      <Search size={16} color={colors.textDim} />
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        placeholder={t('sessions.searchPlaceholder')}
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        style={styles.input}
        accessibilityLabel={t('sessions.searchPlaceholder')}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('sessions.clearSearch')}
        >
          <X size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: {
    flex: 1,
    paddingVertical: space.sm,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
}))
