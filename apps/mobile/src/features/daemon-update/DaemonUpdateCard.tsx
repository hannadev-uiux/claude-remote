import type { DaemonUpdateChannel } from '@remote-harness/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, View } from 'react-native'
import { useConnectionStore, useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { space } from '@/core/theme'
import { Button, Card, Text } from '@/ui'
import { checkDaemonUpdate, startDaemonUpdate, useDaemonUpdateStore } from './store'
import { confirmationWarnings, daemonUpdatePhase, runNote } from './view'

const CHANNELS: DaemonUpdateChannel[] = ['main', 'development']

/**
 * Settings → Computer: the daemon version and channel, a check, and "Update the computer" with
 * the run's progress. Daemons without remote updates show the terminal command.
 */
export function DaemonUpdateCard() {
  const { t } = useTranslation()
  const client = useDaemonClient()
  const version = useConnectionStore((s) => s.hello?.daemonVersion)
  const open = useConnectionStore((s) => s.status === 'open')
  const supported = useDaemonUpdateStore((s) => s.supported)
  const info = useDaemonUpdateStore((s) => s.info)
  const pending = useDaemonUpdateStore((s) => s.pending)
  const [error, setError] = useState<string | null>(null)
  const phase = daemonUpdatePhase(info, supported)
  const note = info ? runNote(info.run, info.current, Date.now()) : null

  const run = (action: () => Promise<void>) => {
    setError(null)
    action().catch((e: unknown) => setError(errorMessage(e, t)))
  }

  const confirmUpdate = () => {
    if (!client || !info || phase.kind !== 'available') return
    const warnings = confirmationWarnings(info)
    const body = [
      warnings.older ? t('daemonUpdate.confirmOlder', { version: phase.label, current: info.current }) : null,
      warnings.busy ? t('daemonUpdate.confirmBusy') : null,
      t('daemonUpdate.confirmBody'),
    ]
      .filter(Boolean)
      .join('\n\n')
    Alert.alert(t('daemonUpdate.confirmTitle'), body, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('daemonUpdate.confirm'),
        style: warnings.older ? 'destructive' : 'default',
        onPress: () => run(() => startDaemonUpdate(client, info.channel)),
      },
    ])
  }

  const message =
    phase.kind === 'unsupported'
      ? t('daemonUpdate.unsupported')
      : phase.kind === 'blocked'
        ? t(`daemonUpdate.blocked.${phase.reason}`)
        : phase.kind === 'running'
          ? t(`daemonUpdate.steps.${phase.step}`)
          : phase.kind === 'checking'
            ? t('daemonUpdate.checking')
            : phase.kind === 'available'
              ? t(phase.downgrade ? 'daemonUpdate.older' : 'daemonUpdate.available', { version: phase.label })
              : phase.kind === 'upToDate'
                ? t('daemonUpdate.upToDate')
                : null

  const canAct = open && client !== null && phase.kind !== 'unsupported' && phase.kind !== 'blocked'
  const running = phase.kind === 'running'

  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('daemonUpdate.title')}</Text>
        <View style={styles.row}>
          <Text size="sm" color="textMuted">
            {t('daemonUpdate.version')}
          </Text>
          <Text size="sm" selectable>
            {version ? `remote-harness ${version}` : '—'}
          </Text>
        </View>
        {supported && info && !info.blocked ? (
          <View style={styles.row}>
            <Text size="sm" color="textMuted">
              {t('daemonUpdate.channel')}
            </Text>
            <View style={styles.chips}>
              {CHANNELS.map((c) => (
                <Button
                  key={c}
                  label={t(`daemonUpdate.channels.${c}`)}
                  compact
                  variant={info.channel === c ? 'primary' : 'secondary'}
                  disabled={!canAct || running || pending !== null}
                  onPress={() => {
                    if (client && c !== info.channel)
                      run(() => checkDaemonUpdate(client, { channel: c, force: true }))
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
        {message ? (
          <Text size="sm" color={phase.kind === 'available' ? 'text' : 'textMuted'}>
            {message}
          </Text>
        ) : null}
        {note?.kind === 'updated' ? (
          <Text size="sm" color="success">
            {t('daemonUpdate.updated', { version: note.version })}
          </Text>
        ) : null}
        {note?.kind === 'failed' && !running ? (
          <Text size="sm" color="warning">
            {[
              t('daemonUpdate.failed', { error: note.error || '?' }),
              note.rolledBack ? t('daemonUpdate.rolledBack', { version: note.version }) : null,
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        ) : null}
        {error ? (
          <Text size="sm" color="warning">
            {error}
          </Text>
        ) : null}
        {phase.kind === 'available' ? (
          <Button
            label={t('daemonUpdate.update')}
            variant="primary"
            loading={pending === 'start'}
            disabled={!canAct || pending !== null}
            onPress={confirmUpdate}
          />
        ) : null}
        {supported && phase.kind !== 'blocked' && !running ? (
          <Button
            label={t('daemonUpdate.check')}
            loading={pending === 'check'}
            disabled={!canAct || pending !== null}
            onPress={() => {
              if (client) run(() => checkDaemonUpdate(client, { force: true }))
            }}
          />
        ) : null}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', gap: space.xs },
})
