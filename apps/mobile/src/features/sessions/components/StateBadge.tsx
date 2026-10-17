import type { SessionState } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '@/ui'

const TONES: Record<SessionState, BadgeTone> = {
  running: 'accent',
  waiting: 'warning',
  idle: 'success',
  ended: 'muted',
}

export function StateBadge({ state }: { state: SessionState }) {
  const { t } = useTranslation()
  return <Badge label={t(`sessions.states.${state}`)} tone={TONES[state]} dot />
}
