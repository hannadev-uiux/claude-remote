import type { SessionState } from '@claude-remote/protocol'
import { Badge, type BadgeTone } from '@/ui'

const STATES: Record<SessionState, { label: string; tone: BadgeTone }> = {
  running: { label: 'rodando', tone: 'accent' },
  waiting: { label: 'aguardando', tone: 'warning' },
  idle: { label: 'ociosa', tone: 'success' },
  ended: { label: 'encerrada', tone: 'muted' },
}

export function StateBadge({ state }: { state: SessionState }) {
  const s = STATES[state]
  return <Badge label={s.label} tone={s.tone} dot />
}
