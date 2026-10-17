import { LiveStatusCard } from '@/features/live-status/LiveStatusCard'
import { ProfileMuteCard } from '@/features/mute/MuteControls'
import { AppUpdatesCard } from '@/features/settings/AppUpdatesCard'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { VoiceLanguageCard } from '@/features/voice/components/VoiceLanguageCard'

export default function SettingsRoute() {
  return (
    <SettingsScreen>
      <ProfileMuteCard />
      <LiveStatusCard />
      <VoiceLanguageCard />
      <AppUpdatesCard />
    </SettingsScreen>
  )
}
