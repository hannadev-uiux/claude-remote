import { router, Stack } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { space } from '@/core/theme'
import { selectPendingCounts, usePermissionsStore } from '@/features/permissions/store'
import { SessionsScreen } from '@/features/sessions/SessionsScreen'
import { headerActions, IconButton } from '@/ui'

export default function SessionsRoute() {
  const pending = usePermissionsStore(useShallow(selectPendingCounts))
  return (
    <>
      <Stack.Screen
        options={headerActions(
          <View style={styles.actions}>
            <IconButton icon={Plus} label="Nova sessão" color="accent" onPress={() => router.push('/new')} />
            <IconButton icon={Settings} label="Configurações" onPress={() => router.push('/settings')} />
          </View>,
        )}
      />
      <SessionsScreen pendingBySession={pending} />
    </>
  )
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: space.xs } })
