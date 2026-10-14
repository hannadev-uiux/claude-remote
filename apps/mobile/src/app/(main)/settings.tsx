import { ProfileMuteCard } from '@/features/mute/MuteControls'
import { SettingsScreen } from '@/features/settings/SettingsScreen'

export default function SettingsRoute() {
  return (
    <SettingsScreen>
      <ProfileMuteCard />
    </SettingsScreen>
  )
}
