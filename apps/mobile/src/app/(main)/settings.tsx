import { ProfileMuteCard } from '@/features/mute/MuteControls'
import { AppUpdatesCard } from '@/features/settings/AppUpdatesCard'
import { SettingsScreen } from '@/features/settings/SettingsScreen'

export default function SettingsRoute() {
  return (
    <SettingsScreen>
      <ProfileMuteCard />
      <AppUpdatesCard />
    </SettingsScreen>
  )
}
