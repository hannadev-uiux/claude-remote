import { MIN_DAEMON_VERSION } from '@claude-remote/protocol'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { daemonOutdated, useUpdatesStore } from '@/core/updates'
import { Text } from './Text'

/** Shown when the computer runs a daemon older than this app needs; dismissed per daemon version. */
export function DaemonUpdateBanner() {
  const { t } = useTranslation()
  const version = useConnectionStore((s) => s.hello?.daemonVersion)
  const dismissed = useUpdatesStore((s) => s.dismissedDaemonVersion)
  if (!version || version === dismissed || !daemonOutdated(version, MIN_DAEMON_VERSION)) return null
  return (
    <View style={styles.base}>
      <Text size="xs" color="info" style={styles.text}>
        {t('updates.daemonOutdated', { version, minimum: MIN_DAEMON_VERSION })}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => useUpdatesStore.setState({ dismissedDaemonVersion: version })}
      >
        <Text size="xs" color="textMuted">
          {t('updates.dismiss')}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
    paddingHorizontal: space.lg,
    backgroundColor: colors.infoMuted,
  },
  text: { flex: 1 },
})
