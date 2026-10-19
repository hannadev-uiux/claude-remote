import { ErrorReportsCard } from '@/features/error-reports/components/ErrorReportsCard'
import { AppUpdatesCard } from '@/features/settings/AppUpdatesCard'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { VoiceLanguageCard } from '@/features/voice/components/VoiceLanguageCard'

export default function SettingsRoute() {
  return (
    <SettingsScreen>
      <VoiceLanguageCard />
      <AppUpdatesCard />
      <ErrorReportsCard />
    </SettingsScreen>
  )
}
