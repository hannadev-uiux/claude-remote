import { MIN_DAEMON_VERSION } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space, useTheme } from '@/core/theme'
import { daemonOutdated, useUpdatesStore } from '@/core/updates'
import { Text } from './Text'

/** Shown when the computer runs a daemon older than this app needs; dismissed per daemon version. */
export function DaemonUpdateBanner() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const version = useConnectionStore((s) => s.hello?.daemonVersion)
  // Daemons that update from the app point there instead of the terminal.
  const fromApp = useConnectionStore((s) => Boolean(s.hello?.update))
  const dismissed = useUpdatesStore((s) => s.dismissedDaemonVersion)
  if (!version || version === dismissed || !daemonOutdated(version, MIN_DAEMON_VERSION)) return null
  return (
    <View style={[styles.base, { backgroundColor: colors.infoSoft }]}>
      <Text size="xs" color="info" style={styles.text}>
        {t(fromApp ? 'updates.daemonOutdatedApp' : 'updates.daemonOutdated', {
          version,
          minimum: MIN_DAEMON_VERSION,
        })}
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
  },
  text: { flex: 1 },
})
