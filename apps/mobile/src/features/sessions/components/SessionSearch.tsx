import { Search, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, TextInput, View } from 'react-native'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'

/** Search field above the session list (title and folder). */
export function SessionSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.box}>
      <Search size={16} color={colors.textDim} />
      <TextInput
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
