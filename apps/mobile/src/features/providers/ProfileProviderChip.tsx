import type { Profile } from '@remote-harness/protocol'
import { ProviderChip } from '@/ui'

/** The profile's `via <provider>` chip, nothing for a profile on the Anthropic account. */
export function ProfileProviderChip({ profile }: { profile: Pick<Profile, 'provider'> }) {
  return profile.provider ? <ProviderChip kind={profile.provider.kind} /> : null
}
