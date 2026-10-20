import type { Session, WorktreeAction, WorktreeInfo } from '@remote-harness/protocol'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { Button, Text } from '@/ui'
import { closeOptions } from '../actions'
import { agentLabel, sessionAgent } from '../agent'
import { useSessionsStore } from '../store'

type Mode = 'close' | 'cleanup'

/** Closing waits up to 10 s for the agent; a push may take longer than the default reply timeout. */
const REQUEST_TIMEOUT_MS = 90_000

/**
 * Confirmation for closing a session (graceful sequence explained, stronger warning while it works
 * or waits) with the optional worktree cleanup and its outcomes; in `cleanup` mode only the
 * worktree of an ended session is handled. Git's message shows under the buttons when a push fails.
 */
export function CloseSessionSheet({
  session,
  mode,
  onDone,
}: {
  session: Session | null
  mode: Mode
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const client = useDaemonClient()
  const [worktree, setWorktree] = useState<WorktreeInfo | null | 'loading'>('loading')
  const [deleteWorktree, setDeleteWorktree] = useState(mode === 'cleanup')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The worktree action whose cleanup failed: the sheet then offers Retry and Keep the worktree.
  const [failed, setFailed] = useState<WorktreeAction | null>(null)
  const sessionId = session?.id
  // Live copy: after a close whose worktree step failed, the session has already ended.
  const live = useSessionsStore((s) => (sessionId ? s.sessions[sessionId] : undefined))

  useEffect(() => {
    if (!client || !sessionId) return
    let cancelled = false
    setWorktree('loading')
    setError(null)
    setFailed(null)
    setDeleteWorktree(mode === 'cleanup')
    client.request({ type: 'worktree.inspect', sessionId }).then(
      (reply) => {
        if (!cancelled) setWorktree(reply.type === 'worktree.info' ? reply.worktree : null)
      },
      // Older daemon or a failure: no cleanup is offered.
      () => {
        if (!cancelled) setWorktree(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [client, sessionId, mode])

  if (!session) return null
  const loading = worktree === 'loading'
  const info = loading ? null : worktree
  const title = session.title || t('common.session')
  const stateKey =
    session.state === 'running'
      ? 'closeSession.stateRunning'
      : session.state === 'waiting'
        ? 'closeSession.stateWaiting'
        : 'closeSession.stateIdle'
  const choices = info && deleteWorktree ? closeOptions(info) : []
  const agent = agentLabel(sessionAgent(session), t, { sentence: true })
  const warn =
    info && deleteWorktree && (info.dirty > 0 || info.unpushed > 0)
      ? [
          info.dirty > 0 ? t('closeSession.dirty', { count: info.dirty }) : null,
          info.unpushed > 0 ? t('closeSession.unpushed', { count: info.unpushed }) : null,
        ]
          .filter(Boolean)
          .join(` ${t('closeSession.and')} `)
      : null

  const run = async (action: WorktreeAction | null, cleanupOnly = mode === 'cleanup') => {
    if (!client) return
    setBusy(true)
    setError(null)
    try {
      const options = { timeoutMs: REQUEST_TIMEOUT_MS }
      if (cleanupOnly) {
        if (action) await client.request({ type: 'worktree.cleanup', sessionId: session.id, action }, options)
      } else {
        await client.request(
          { type: 'session.close', sessionId: session.id, ...(action ? { worktree: action } : {}) },
          options,
        )
      }
      onDone()
    } catch (e) {
      // The agent still holds the worktree (a lock it has not released): retry or keep it.
      setError(errorMessage(e, t, { session_busy: t('closeSession.worktreeInUse') }))
      setFailed(action)
    } finally {
      setBusy(false)
    }
  }
  // Retry only the worktree step once the session is no longer running (the close went through).
  const retry = (action: WorktreeAction) =>
    void run(action, mode === 'cleanup' || !(live ?? session).controllable)
  const confirmDiscard = () =>
    Alert.alert(t('closeSession.discardTitle'), t('closeSession.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('closeSession.discardConfirm'),
        style: 'destructive',
        onPress: () => void run('discard-delete'),
      },
    ])

  const buttons: {
    key: string
    label: string
    variant: 'primary' | 'danger' | 'secondary'
    onPress: () => void
  }[] = []
  if (failed) {
    buttons.push({
      key: 'retry',
      label: t('closeSession.retry'),
      variant: 'primary',
      onPress: () => retry(failed),
    })
    // Still running (the close itself was refused): keeping the worktree still closes the session.
    const stillOpen = mode === 'close' && (live ?? session).controllable
    buttons.push({
      key: 'keep',
      label: stillOpen ? t('closeSession.keep') : t('closeSession.keepAfterFailure'),
      variant: 'secondary',
      onPress: stillOpen ? () => void run(null) : onDone,
    })
  } else if (choices.includes('push-delete') && info) {
    buttons.push({
      key: 'push',
      label: info.dirty > 0 ? t('closeSession.pushDelete') : t('closeSession.pushOnlyDelete'),
      variant: 'primary',
      onPress: () => void run('push-delete'),
    })
    buttons.push({
      key: 'discard',
      label: t('closeSession.discardDelete'),
      variant: 'danger',
      onPress: confirmDiscard,
    })
    if (mode === 'close') {
      buttons.push({
        key: 'keep',
        label: t('closeSession.keep'),
        variant: 'secondary',
        onPress: () => void run(null),
      })
    }
  } else if (choices.includes('delete')) {
    buttons.push({
      key: 'delete',
      label: mode === 'close' ? t('closeSession.closeDelete') : t('closeSession.deleteOnly'),
      variant: 'danger',
      onPress: () => void run('delete'),
    })
    if (mode === 'close') {
      buttons.push({
        key: 'keep',
        label: t('closeSession.keep'),
        variant: 'secondary',
        onPress: () => void run(null),
      })
    }
  } else if (mode === 'close') {
    buttons.push({
      key: 'close',
      label: t('closeSession.close'),
      variant: 'danger',
      onPress: () => void run(null),
    })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onDone}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" accessibilityRole="header">
            {mode === 'close' ? t('closeSession.title') : t('closeSession.cleanupTitle')}
          </Text>
          <Text size="sm" color="textMuted">
            {mode === 'close' ? (
              <>
                “{title}”{' '}
                <Text
                  size="sm"
                  color={session.state === 'idle' || session.state === 'ended' ? 'textMuted' : 'warning'}
                >
                  {t(stateKey)}
                </Text>
                {t('closeSession.body', { agent })}
              </>
            ) : (
              t('closeSession.cleanupBody', { title })
            )}
          </Text>
          {loading ? (
            <Text size="xs" color="textDim">
              {t('closeSession.inspecting')}
            </Text>
          ) : info ? (
            <View style={styles.worktree}>
              {mode === 'close' ? (
                <Switch
                  value={deleteWorktree}
                  onValueChange={setDeleteWorktree}
                  accessibilityLabel={t('closeSession.deleteWorktree')}
                  trackColor={{ true: colors.accent, false: colors.borderStrong }}
                />
              ) : null}
              <View style={styles.text}>
                <Text size="sm">{t('closeSession.deleteWorktree')}</Text>
                <Text size="xs" color="textMuted" numberOfLines={2}>
                  {info.branch
                    ? t('closeSession.worktreeDetail', { path: shortPath(info.path), branch: info.branch })
                    : shortPath(info.path)}
                </Text>
              </View>
            </View>
          ) : null}
          {failed && error ? (
            <View style={styles.failure} accessibilityLiveRegion="polite">
              <Text size="xs" weight="bold" color="danger">
                {t('closeSession.cleanupFailed')}
              </Text>
              <Text size="xs" color="danger" selectable>
                {error}
              </Text>
            </View>
          ) : null}
          {warn && !failed ? (
            <View style={styles.warn}>
              <Text size="xs" color="warning">
                ⚠{' '}
                <Text size="xs" weight="bold" color="warning">
                  {warn}
                </Text>
                . {t('closeSession.warnTail')}
              </Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            {buttons.map((button) => (
              <Button
                key={button.key}
                label={button.label}
                variant={button.variant}
                loading={busy && button.key !== 'keep'}
                disabled={busy}
                onPress={button.onPress}
              />
            ))}
            <Button label={t('common.cancel')} variant="ghost" disabled={busy} onPress={onDone} />
          </View>
          {error && !failed ? (
            <Text size="xs" color="danger">
              {error}
            </Text>
          ) : null}
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
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  worktree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: { flex: 1, gap: 2 },
  warn: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: theme.colors.warningSoft,
  },
  failure: {
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: theme.colors.dangerSoft,
  },
  actions: { gap: space.sm },
}))
