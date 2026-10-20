import type { Profile, Session } from '@remote-harness/protocol'
import {
  Bell,
  BellOff,
  Copy,
  EyeOff,
  FolderGit2,
  type LucideIcon,
  Pin,
  PinOff,
  Play,
  Power,
  Radio,
  RadioOff,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { AgentBadge, Button, ProfileTag, Text } from '@/ui'
import type { SessionAction, SessionActionItem } from '../actions'
import { sessionAgent } from '../agent'

const ICONS: Record<SessionAction, LucideIcon> = {
  close: Power,
  resume: Play,
  mute: BellOff,
  unmute: Bell,
  pin: Pin,
  unpin: PinOff,
  cleanup: FolderGit2,
  copyPath: Copy,
  hide: EyeOff,
  followLive: Radio,
  unfollowLive: RadioOff,
}

/** Bottom sheet with a session's actions (long press or "More" on the list). */
export function SessionActionsSheet({
  session,
  profile,
  items,
  onSelect,
  onClose,
}: {
  session: Session | null
  profile: Pick<Profile, 'name' | 'color'> | undefined
  items: SessionActionItem[]
  onSelect: (action: SessionAction) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const agent = session ? sessionAgent(session) : null
  return (
    <Modal visible={session !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.header}>
            {agent ? <AgentBadge agent={agent} /> : null}
            <Text weight="bold" numberOfLines={1} style={styles.title}>
              {session?.title || t('common.session')}
            </Text>
            {profile ? <ProfileTag profile={profile} /> : null}
          </View>
          {items.map((item) => {
            const Icon = ICONS[item.key]
            const color = item.destructive ? 'danger' : 'text'
            return (
              <Pressable
                key={item.key}
                accessibilityRole="menuitem"
                onPress={() => onSelect(item.key)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <Icon size={18} color={item.destructive ? colors.danger : colors.textMuted} />
                <View style={styles.text}>
                  <Text color={color}>{item.label}</Text>
                  {item.detail ? (
                    <Text size="xs" color="textMuted" numberOfLines={1}>
                      {item.detail}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )
          })}
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.xxs,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.sm },
  title: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  text: { flex: 1, gap: 2 },
}))
