import type { Profile } from '@remote-harness/protocol'
import { ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, StyleSheet, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { AGENT_NAMES } from '@/core/theme/agents'
import { shortPath } from '@/core/utils/time'
import { profileAgent, profileDetail } from '@/features/lifecycle/new-session'
import { setMuted, useMuteStore } from '@/features/mute/store'
import { creditsLeft, formatCredits, providerName } from '@/features/providers/logic'
import { ProfileProviderChip } from '@/features/providers/ProfileProviderChip'
import { useProviderStatus } from '@/features/providers/use-provider'
import { AgentBadge, Button, Card, Text } from '@/ui'

/** Settings → Profiles: badge · name · `Claude Code · ~/.claude · alias personal`; tap for details. */
export function ProfilesCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const profiles = useConnectionStore(selectProfiles)
  const hello = useConnectionStore((s) => s.hello)
  const [selected, setSelected] = useState<Profile | null>(null)
  return (
    <Card>
      <View style={layout.gap}>
        <Text weight="bold">{t('settings.profiles')}</Text>
        {profiles.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => setSelected(p)}
            style={({ pressed }) => [styles.row, pressed && layout.pressed]}
          >
            <AgentBadge agent={profileAgent(p)} />
            <View style={layout.flex}>
              <View style={layout.nameRow}>
                <Text
                  weight="medium"
                  numberOfLines={1}
                  style={[layout.shrink, { color: p.color || colors.text }]}
                >
                  {p.name}
                </Text>
                <ProfileProviderChip profile={p} />
              </View>
              <Text size="xs" color="textMuted" numberOfLines={1}>
                {profileDetail(p)} · {t('settings.alias', { alias: p.id })}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textDim} />
          </Pressable>
        ))}
        {hello && profiles.length === 0 ? (
          <Text size="sm" color="textMuted">
            {t('settings.noProfiles')}
          </Text>
        ) : null}
      </View>
      <ProfileDetailsSheet profile={selected} onClose={() => setSelected(null)} />
    </Card>
  )
}

function ProfileDetailsSheet({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const client = useDaemonClient()
  const muted = useMuteStore((s) => (profile ? s.profiles.includes(profile.id) : false))
  const toggle = (on: boolean) => {
    if (!client || !profile) return
    setMuted(client, 'profile', profile.id, !on).catch((error: unknown) =>
      Alert.alert(t('mute.changeFailed'), errorMessage(error, t)),
    )
  }
  return (
    <Modal visible={profile !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          {profile ? (
            <>
              <View style={layout.header}>
                <AgentBadge agent={profileAgent(profile)} />
                <Text
                  weight="bold"
                  numberOfLines={1}
                  style={[layout.flex, { color: profile.color || colors.text }]}
                >
                  {profile.name}
                </Text>
              </View>
              <DetailRow label={t('settings.profileAgent')} value={AGENT_NAMES[profileAgent(profile)]} />
              <DetailRow label={t('settings.profileAlias')} value={profile.id} />
              <DetailRow label={t('settings.profileConfigDir')} value={shortPath(profile.configDir)} />
              <ProviderRows profile={profile} />
              <View style={layout.between}>
                <Text size="sm">{t('settings.profileNotifications')}</Text>
                <Switch
                  value={!muted}
                  onValueChange={toggle}
                  accessibilityLabel={t('settings.profileNotifications')}
                  trackColor={{ true: colors.accent, false: colors.borderStrong }}
                />
              </View>
            </>
          ) : null}
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** Provider, default model and credits left (or the hint to store the key); nothing for the Anthropic account. */
function ProviderRows({ profile }: { profile: Profile }) {
  const { t } = useTranslation()
  const name = providerName(profile)
  const status = useProviderStatus(name ? profile.id : null)
  if (!name) return null
  const left = creditsLeft(status.data?.credits)
  const credits = !status.data
    ? '…'
    : !status.data.hasKey
      ? t('settings.keyMissing', { profile: profile.id })
      : left !== null
        ? t('settings.creditsLeft', { amount: formatCredits(left) })
        : t('settings.creditsUnknown')
  return (
    <>
      <DetailRow label={t('settings.profileProvider')} value={name} />
      <DetailRow
        label={t('settings.profileModel')}
        value={profile.provider?.model ?? t('newSession.modelDefault')}
      />
      <DetailRow label={t('settings.profileCredits')} value={credits} />
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={layout.between}>
      <Text size="sm" color="textMuted">
        {label}
      </Text>
      <Text size="sm" selectable numberOfLines={1} style={layout.value}>
        {value}
      </Text>
    </View>
  )
}

const layout = StyleSheet.create({
  gap: { gap: space.xs },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  shrink: { flexShrink: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  value: { flexShrink: 1, textAlign: 'right' },
})

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
  },
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
}))
