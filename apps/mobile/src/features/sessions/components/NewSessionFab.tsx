import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { makeStyles, space, useTheme } from '@/core/theme'

/** Floating action button over the compact session list; the sidebar header keeps its own icon instead. */
export function NewSessionFab() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('nav.newSession')}
      onPress={() => {
        void Haptics.selectionAsync()
        router.push('/new')
      }}
      style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Plus size={24} color={colors.accentInk} strokeWidth={2.5} />
    </Pressable>
  )
}

const FAB_SIZE = 56

export const NEW_SESSION_FAB_SPACE = FAB_SIZE + space.lg * 2

const useStyles = makeStyles((theme) => ({
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
}))
