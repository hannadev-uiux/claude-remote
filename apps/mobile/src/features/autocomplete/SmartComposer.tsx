import { MAX_ATTACHMENTS } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { ImagePlus } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, type TextInput } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { useShallow } from 'zustand/react/shallow'
import { useBackHandler } from '@/core/platform/use-back-handler'
import { IconButton } from '@/ui'
import { AttachmentChips } from '../attachments/components/AttachmentChips'
import { remainingSlots } from '../attachments/limits'
import { type ImageSource, useImagePicker } from '../attachments/use-image-picker'
import { PromptComposer } from '../conversation/components/PromptComposer'
import type { usePrompt } from '../conversation/use-prompt'
import { selectPendingFor, usePermissionsStore } from '../permissions/store'
import { willQueue } from '../queue/logic'
import { selectQueueFor, useQueueStore } from '../queue/store'
import { sessionAgent } from '../sessions/agent'
import { useSessionsStore } from '../sessions/store'
import { RecordingOverlay } from '../voice/components/RecordingOverlay'
import { VoiceButton } from '../voice/components/VoiceButton'
import { insertTranscriptAtCursor } from '../voice/insert-at-cursor'
import { useVoiceRecording } from '../voice/use-voice-recording'
import { SuggestionList } from './SuggestionList'
import { applySuggestion, findTrigger, isInteractiveCommand, triggerKey } from './trigger'
import { useCommands, useSuggestions } from './use-suggestions'

type Props = { sessionId: string; prompt: ReturnType<typeof usePrompt>; disabled: boolean }

/** Prompt composer with `@` file and `/` command suggestions. */
export function SmartComposer({ sessionId, prompt, disabled }: Props) {
  const { t } = useTranslation()
  const input = useRef<TextInput>(null)
  const [cursor, setCursor] = useState(0)
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>()
  // Token whose suggestions were closed with the back button.
  const [dismissed, setDismissed] = useState<string | null>(null)
  const found = useMemo(
    () => (disabled ? null : findTrigger(prompt.text, cursor)),
    [prompt.text, cursor, disabled],
  )
  const trigger = found && triggerKey(found) !== dismissed ? found : null
  // Leaving the token forgets the dismissal, so typing `@` there again shows suggestions.
  useEffect(() => {
    if (!found) setDismissed(null)
  }, [found])
  useBackHandler(trigger !== null, () => setDismissed(triggerKey(trigger)))
  const agent = useSessionsStore((s) => {
    const session = s.sessions[sessionId]
    return session ? sessionAgent(session) : null
  })
  const session = useSessionsStore((s) => s.sessions[sessionId])
  const pendingPermissions = usePermissionsStore(useShallow(selectPendingFor(sessionId))).length
  const queued = useQueueStore(selectQueueFor(sessionId)).length
  // Send holds the prompt while the agent is busy; the hint tells how to paste it mid-turn instead.
  const queueing = willQueue(session, pendingPermissions, queued)
  const suggestions = useSuggestions(sessionId, trigger)
  const commands = useCommands(sessionId)

  const insert = (next: { text: string; cursor: number }) => {
    prompt.setText(next.text)
    setCursor(next.cursor)
    setSelection({ start: next.cursor, end: next.cursor })
    // Let the controlled selection apply once, then hand control back to the user.
    setTimeout(() => setSelection(undefined), 0)
    input.current?.focus()
  }

  const voice = useVoiceRecording((transcript) =>
    insert(insertTranscriptAtCursor(prompt.text, cursor, transcript)),
  )

  const picker = useImagePicker()
  const pickFrom = async (source: ImageSource) => {
    try {
      prompt.addAttachments(await picker.pick(source, remainingSlots(prompt.attachments.length)))
    } catch (e) {
      prompt.setError(e instanceof Error ? e.message : String(e))
    }
  }
  const attach = () => {
    if (remainingSlots(prompt.attachments.length) === 0) {
      prompt.setError(t('attachments.limit', { count: MAX_ATTACHMENTS }))
      return
    }
    Alert.alert(t('attachments.chooseTitle'), undefined, [
      { text: t('attachments.camera'), onPress: () => void pickFrom('camera') },
      { text: t('attachments.library'), onPress: () => void pickFrom('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ])
  }

  const send = async (mode: 'auto' | 'now' = 'auto') => {
    const text = prompt.text
    const interactive = isInteractiveCommand(text, commands.data ?? [])
    const ok = await prompt.send(mode)
    // Menus like /model only exist in the TUI: show the raw terminal to drive them.
    if (interactive && ok) router.push({ pathname: '/session/[id]/terminal', params: { id: sessionId } })
  }

  const canSendRef = useRef(false)
  canSendRef.current =
    !disabled && !prompt.sending && (prompt.text.trim().length > 0 || prompt.attachments.length > 0)
  const sendRef = useRef(send)
  sendRef.current = send

  // Hardware keyboard: Cmd+Enter sends; plain Enter already inserts a newline by default on TextInput.
  useEffect(() => {
    return addListener(
      { input: constants.keyInputEnter, modifierFlags: constants.keyModifierCommand },
      () => {
        // ⌘⏎ pastes mid-turn, like Claude Code's Ctrl+Enter; the Send button queues while busy.
        if (canSendRef.current) void sendRef.current('now')
      },
    )
  }, [])

  return (
    <PromptComposer
      ref={input}
      value={prompt.text}
      onChangeText={prompt.setText}
      selection={selection}
      onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
      onSend={() => void send()}
      sending={prompt.sending}
      disabled={disabled}
      error={prompt.error}
      agent={agent}
      onSendNow={() => void send('now')}
      hint={queueing ? t('queue.holdHint') : null}
      onKey={prompt.sendKey}
      keysDisabled={disabled}
      accessory={
        trigger ? (
          <SuggestionList
            suggestions={suggestions}
            onPickFile={(item) => insert(applySuggestion(prompt.text, trigger, { kind: 'file', item }))}
            onPickCommand={(item) => insert(applySuggestion(prompt.text, trigger, { kind: 'command', item }))}
          />
        ) : voice.state !== 'idle' ? (
          <RecordingOverlay
            state={voice.state}
            level={voice.level}
            elapsedMs={voice.elapsedMs}
            onCancel={voice.cancel}
            onDone={voice.stop}
            onRetryOnline={() => void voice.retryOnline()}
          />
        ) : null
      }
      hasAttachments={prompt.attachments.length > 0}
      voiceActive={voice.state === 'recording' || voice.state === 'transcribing'}
      attachments={
        <AttachmentChips
          images={prompt.attachments}
          onRemove={prompt.removeAttachment}
          disabled={prompt.sending}
        />
      }
      attachButton={
        <IconButton
          icon={ImagePlus}
          label={t('attachments.attach')}
          disabled={disabled || picker.busy || prompt.sending}
          onPress={attach}
        />
      }
      voiceButton={
        <VoiceButton
          state={voice.state}
          disabled={disabled}
          onStart={() => void voice.start()}
          onStop={voice.stop}
        />
      }
    />
  )
}
