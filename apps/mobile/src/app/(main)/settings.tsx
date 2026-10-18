import { LiveStatusCard } from '@/features/live-status/LiveStatusCard'
import { ProfileMuteCard } from '@/features/mute/MuteControls'
import { PushCard } from '@/features/push/PushCard'
import { AppUpdatesCard } from '@/features/settings/AppUpdatesCard'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { VoiceLanguageCard } from '@/features/voice/components/VoiceLanguageCard'

export default function SettingsRoute() {
  return (
    <SettingsScreen>
      <PushCard />
      <ProfileMuteCard />
      <LiveStatusCard />
      <VoiceLanguageCard />
      <AppUpdatesCard />
    </SettingsScreen>
  )
}
