import { router } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { IconButton } from '@/ui'

/**
 * New session / Settings — used in the stack header (compact) and the master pane header (regular).
 * On compact width the new-session icon is dropped: a floating action button opens `/new` instead.
 */
export function SessionListActions({ newSession = true }: { newSession?: boolean }) {
  const { t } = useTranslation()
  return (
    <View style={styles.actions}>
      {newSession ? (
        <IconButton
          icon={Plus}
          label={t('nav.newSession')}
          color="accentText"
          onPress={() => router.push('/new')}
        />
      ) : null}
      <IconButton icon={Settings} label={t('nav.settings')} onPress={() => router.push('/settings')} />
    </View>
  )
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: space.xs } })
