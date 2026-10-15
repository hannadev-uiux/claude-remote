import { router } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { IconButton } from '@/ui'

/** New session / Settings — used in the stack header (compact) and the master pane header (regular). */
export function SessionListActions() {
  const { t } = useTranslation()
  return (
    <View style={styles.actions}>
      <IconButton
        icon={Plus}
        label={t('nav.newSession')}
        color="accent"
        onPress={() => router.push('/new')}
      />
      <IconButton icon={Settings} label={t('nav.settings')} onPress={() => router.push('/settings')} />
    </View>
  )
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: space.xs } })
