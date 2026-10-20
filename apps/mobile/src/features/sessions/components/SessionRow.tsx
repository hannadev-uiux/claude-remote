import type { Profile, Session } from '@remote-harness/protocol'
import { BellOff, ChevronRight, Pencil, Pin, Radio } from 'lucide-react-native'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { AgentBadge, Badge, ProfileTag, Text } from '@/ui'
import { draftSummary } from '../../drafts/logic'
import { useDraftsStore } from '../../drafts/store'
import { sessionAgent } from '../agent'
import { openSession } from '../open-session'
import { isWorktreePath } from '../summary'
import { StateBadge } from './StateBadge'

type Props = {
  session: Session
  /** The session's profile, for the tag (unknown profiles show their id in the muted color). */
  profile?: Pick<Profile, 'name' | 'color'>
  /** The session or its profile is muted. */
  muted?: boolean
  pendingPermissions?: number
  /** Other live sessions in the same git checkout. */
  sharedCheckout?: number
  /** The session is open in the detail pane. */
  selected?: boolean
  /** Keyboard navigation cursor (arrow keys) — may point to a session other than the open one. */
  keyboardFocused?: boolean
  /** Pinned to the top of the list on this device. */
  pinned?: boolean
  /** This phone follows the session's live status. */
  following?: boolean
  /** Long press opens the session's action sheet. */
  onLongPress?: () => void
}

/**
 * One session: agent badge · title · relative time / folder · branch · worktree · shared checkout /
 * draft (when there is one) / state pill · pending · read-only · profile tag · muted · subagents · background · chevron.
 */
export const SessionRow = memo(function SessionRow({
  session,
  profile,
  muted = false,
  pendingPermissions = 0,
  sharedCheckout = 0,
  selected = false,
  keyboardFocused = false,
  pinned = false,
  following = false,
  onLongPress,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const waiting = pendingPermissions > 0 || session.state === 'waiting'
  const [hovered, setHovered] = useState(false)
  const agent = sessionAgent(session)
  const subagents = session.subagents.length
  return (
    <Pressable
      onPress={() => openSession(session.id)}
      onLongPress={onLongPress}
      delayLongPress={350}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        waiting && styles.waiting,
        selected && styles.selected,
        keyboardFocused && styles.keyboardFocused,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.line}>
        {agent ? <AgentBadge agent={agent} /> : null}
        <Text weight="medium" numberOfLines={1} style={styles.title}>
          {session.title || t('common.session')}
        </Text>
        <Text size="xs" color="textDim" numberOfLines={1}>
          {relativeTime(session.updatedAt, t)}
        </Text>
      </View>
      <View style={styles.line}>
        <Text size="xs" color="textMuted" numberOfLines={1} style={styles.shrink}>
          {shortPath(session.cwd)}
        </Text>
        {session.checkout?.branch ? (
          <Text
            size="xs"
            color="textMuted"
            numberOfLines={1}
            style={styles.shrink}
            accessibilityLabel={t('sessions.branch', { branch: session.checkout.branch })}
          >
            ⎇ {session.checkout.branch}
          </Text>
        ) : null}
        {isWorktreePath(session.cwd) ? (
          <Text size="xs" color="textMuted" numberOfLines={1}>
            ⌂ {t('sessions.worktree')}
          </Text>
        ) : null}
        {sharedCheckout > 0 ? (
          <Text size="xs" color="warning" numberOfLines={1}>
            {t('sessions.sharedCheckout', { count: sharedCheckout })}
          </Text>
        ) : null}
      </View>
      <DraftLine sessionId={session.id} />
      <View style={styles.meta}>
        <StateBadge state={session.state} />
        {pendingPermissions > 0 ? (
          <Badge label={t('permissions.pending', { count: pendingPermissions })} tone="warning" />
        ) : null}
        {!session.controllable ? <Badge label={t('common.readOnly')} /> : null}
        <ProfileTag profile={profile ?? { name: session.profileId, color: '' }} />
        {pinned ? (
          <Pin size={12} color={colors.accentText} accessibilityLabel={t('sessionActions.pinned')} />
        ) : null}
        {following ? (
          <Radio size={12} color={colors.accentText} accessibilityLabel={t('liveFollow.following')} />
        ) : null}
        {muted ? <BellOff size={12} color={colors.textDim} accessibilityLabel={t('sessions.muted')} /> : null}
        {subagents > 0 ? <Badge label={t('sessions.subagents', { count: subagents })} /> : null}
        {session.backgroundTasks > 0 ? (
          <Badge label={t('sessions.background', { count: session.backgroundTasks })} tone="info" />
        ) : null}
        <View style={styles.spacer} />
        <ChevronRight size={16} color={colors.textDim} />
      </View>
    </Pressable>
  )
})

/** `Draft: <start of the text>` while the session has an unsent prompt on this device. */
function DraftLine({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const summary = useDraftsStore(useShallow((s) => draftSummary(s.drafts[sessionId])))
  if (!summary) return null
  const preview = 'text' in summary ? summary.text : t('drafts.photos', { count: summary.photos })
  return (
    <View style={styles.line} accessible accessibilityLabel={t('drafts.rowLabel', { preview })}>
      <Pencil size={11} color={colors.accentText} />
      <Text size="xs" color="accentText" numberOfLines={1} style={styles.shrink}>
        {t('drafts.label')}{' '}
        <Text size="xs" color="textMuted">
          {preview}
        </Text>
      </Text>
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  row: {
    gap: 5,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  waiting: { borderColor: theme.colors.warning },
  selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  keyboardFocused: { borderColor: theme.colors.accent },
  hovered: { backgroundColor: theme.colors.surfaceRaised },
  pressed: { opacity: 0.7 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 },
  title: { flex: 1 },
  shrink: { flexShrink: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  spacer: { flex: 1 },
}))
