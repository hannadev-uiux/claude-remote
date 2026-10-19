import type { Profile } from '@remote-harness/protocol'
import { ProviderChip } from '@/ui'
import { providerName } from './logic'

/** The profile's `via <provider>` chip, nothing for a profile on the Anthropic account. */
export function ProfileProviderChip({ profile }: { profile: Pick<Profile, 'provider'> }) {
  const name = providerName(profile)
  return name ? <ProviderChip provider={name} /> : null
}
