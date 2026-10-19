import Constants from 'expo-constants'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { space } from '@/core/theme'
import { DaemonUpdateCard } from '@/features/daemon-update/DaemonUpdateCard'
import { Screen, Text } from '@/ui'
import { AppearanceCard } from './AppearanceCard'
import { MachineCard } from './MachineCard'
import { NotificationsCard } from './NotificationsCard'
import { ProfilesCard } from './ProfilesCard'

/** Machine → Appearance → Profiles → Notifications → Computer → the route's cards (Voice, App). */
export function SettingsScreen({ children }: { children?: ReactNode }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <MachineCard />
        <AppearanceCard />
        <ProfilesCard />
        <NotificationsCard />
        <DaemonUpdateCard />
        {children}
        <Text size="xs" color="textDim" style={styles.center}>
          Remote Harness {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  center: { textAlign: 'center' },
})
