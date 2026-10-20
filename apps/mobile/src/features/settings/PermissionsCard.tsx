import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'
import { Card, Text } from '@/ui'

/** Settings → Permissions: opens the Permissions screen (what this phone and the computer can access). */
export function PermissionsCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/permissions')}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <Text weight="bold">{t('settings.permissions')}</Text>
          <Text size="xs" color="textMuted">
            {t('settings.permissionsHint')}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.textDim} />
      </Pressable>
    </Card>
  )
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
}))
