import { MAX_ATTACHMENTS } from '@remote-harness/protocol'
import { router, useIsFocused } from 'expo-router'
import { ImagePlus } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform, type TextInput } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { keys, useKeyCommand } from '@/core/keyboard/key-commands'
import { useLayout } from '@/core/layout'
import { useBackHandler } from '@/core/platform/use-back-handler'
import { useKeyboardHeight } from '@/core/platform/use-keyboard-height'
import { IconButton } from '@/ui'
import { AttachmentChips } from '../attachments/components/AttachmentChips'
import { remainingSlots } from '../attachments/limits'
import { type ImageSource, useImagePicker } from '../attachments/use-image-picker'
import { composerAutocorrect } from '../conversation/autocorrect'
import { useAutocorrectSettings } from '../conversation/autocorrect-store'
import { PromptComposer } from '../conversation/components/PromptComposer'
import { keyboardHints } from '../conversation/keyboard-hints'
import { hardwareKeyboard } from '../conversation/keyboard-toolbar'
import { insertAtSelection, returnAction, type Selection } from '../conversation/return-key'
import { useReturnKeySettings } from '../conversation/return-key-store'
import type { usePrompt } from '../conversation/use-prompt'
import { selectPendingFor, usePermissionsStore } from '../permissions/store'
import { willQueue } from '../queue/logic'
import { selectQueueFor, useQueueStore } from '../queue/store'
import { sessionAgent } from '../sessions/agent'
import { useSessionsStore } from '../sessions/store'
import { useShortcutRequest } from '../shortcuts/use-shortcut-request'
import { RecordingOverlay } from '../voice/components/RecordingOverlay'
import { VoiceButton } from '../voice/components/VoiceButton'
import { insertTranscriptAtCursor } from '../voice/insert-at-cursor'
import { useVoiceRecording } from '../voice/use-voice-recording'
import { useVoiceInteractionStore } from '../voice/voice-interaction-store'
import { moveHighlight, type PickableRow, pickableRows } from './keyboard'
import { sentCommand } from './recents'
import { recordCommandUse } from './recents-store'
import { SuggestionList } from './SuggestionList'
import { applySuggestion, findTrigger, insertTrigger, isInteractiveCommand, triggerKey } from './trigger'
import { useCommands, useSuggestions } from './use-suggestions'

type Props = {
  sessionId: string
  prompt: ReturnType<typeof usePrompt>
  disabled: boolean
  /** Focuses the input once on mount, e.g. right after creating this session. */
  autoFocus?: boolean
}

/** Prompt composer with `@` file and `/` command suggestions. */
export function SmartComposer({ sessionId, prompt, disabled, autoFocus }: Props) {
  const { t } = useTranslation()
  const input = useRef<TextInput>(null)
  // Only on mount: a session opened once with `autoFocus` shouldn't re-focus on later re-renders.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only.
  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [])
  const [cursor, setCursor] = useState(0)
  // The whole selection, for ⇧⏎ replacing selected text; `cursor` is its end.
  const [selected, setSelected] = useState<Selection>({ start: 0, end: 0 })
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
  const { layout } = useLayout()
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

  const voice = useVoiceRecording(sessionId, (transcript) =>
    insert(insertTranscriptAtCursor(prompt.text, cursor, transcript)),
  )
  const pushToTalk = useVoiceInteractionStore((s) => s.pushToTalk)

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
    const command = sentCommand(text, commands.data ?? [])
    const ok = await prompt.send(mode)
    if (ok && command && session) void recordCommandUse(session.profileId, command)
    // Menus like /model only exist in the TUI: show the raw terminal to drive them.
    if (interactive && ok) router.push({ pathname: '/session/[id]/terminal', params: { id: sessionId } })
  }

  const canSendRef = useRef(false)
  canSendRef.current =
    !disabled && !prompt.sending && (prompt.text.trim().length > 0 || prompt.attachments.length > 0)
  const sendRef = useRef(send)
  sendRef.current = send

  // Phones keep other sessions mounted under this one: only the session on screen takes the keys.
  const onScreen = useIsFocused()
  // Hardware keyboard: ⌘⏎ pastes mid-turn, like Claude Code's Ctrl+Enter; the Send button queues while busy.
  useKeyCommand(
    { input: keys.keyInputEnter, modifierFlags: keys.keyModifierCommand },
    () => {
      if (canSendRef.current) void sendRef.current('now')
    },
    onScreen,
  )
  // Esc closes the open suggestions before the shell's Esc blurs the field.
  useKeyCommand(
    { input: keys.keyInputEscape },
    () => {
      if (!input.current?.isFocused()) return false
      setDismissed(triggerKey(trigger))
    },
    onScreen && trigger !== null,
  )
  // ⌘L: write in the session on screen.
  useShortcutRequest('composerFocus', () => input.current?.focus(), onScreen && !disabled)

  // Return sends with a hardware keyboard (or with "Return key sends"); then it accepts the
  // highlighted suggestion first, and ⇧⏎ / ↑ / ↓ / Tab need priority over the focused field (iOS).
  const [focused, setFocused] = useState(false)
  const keyboardHeight = useKeyboardHeight()
  const tablet = layout !== 'compact'
  const hardware = hardwareKeyboard({ os: Platform.OS, tablet, focused, keyboardHeight })
  const returnSends = useReturnKeySettings((s) => s.sends)
  const autocorrect = useAutocorrectSettings((s) => s.enabled)
  const submit = hardware || returnSends
  const rows = useMemo(() => (trigger ? pickableRows(suggestions) : []), [trigger, suggestions])
  const [highlight, setHighlight] = useState(0)
  const query = trigger ? `${triggerKey(trigger)}:${trigger.query}` : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new query starts from the first row.
  useEffect(() => setHighlight(0), [query])
  const highlighted = Math.min(highlight, Math.max(rows.length - 1, 0))
  const accept = (row: PickableRow | undefined) => {
    if (trigger && row) insert(applySuggestion(prompt.text, trigger, row))
  }
  const onSubmit = () => {
    const action = returnAction({ suggestionRows: rows.length, canSend: canSendRef.current })
    if (action === 'accept') accept(rows[highlighted])
    if (action === 'send') void send()
  }
  const keysInField = onScreen && focused && hardware && Platform.OS === 'ios'
  useKeyCommand(
    { input: keys.keyInputEnter, modifierFlags: keys.keyModifierShift },
    () => insert(insertAtSelection(prompt.text, selected, '\n')),
    keysInField,
    { priority: true },
  )
  const suggestionKeys = keysInField && rows.length > 0
  useKeyCommand(
    { input: keys.keyInputDownArrow },
    () => setHighlight(moveHighlight(rows.length, highlighted, 1)),
    suggestionKeys,
    { priority: true },
  )
  useKeyCommand(
    { input: keys.keyInputUpArrow },
    () => setHighlight(moveHighlight(rows.length, highlighted, -1)),
    suggestionKeys,
    { priority: true },
  )
  useKeyCommand({ input: '\t' }, () => accept(rows[highlighted]), suggestionKeys, { priority: true })

  return (
    <PromptComposer
      ref={input}
      value={prompt.text}
      onChangeText={prompt.setText}
      selection={selection}
      onSelectionChange={(e) => {
        setCursor(e.nativeEvent.selection.end)
        setSelected(e.nativeEvent.selection)
      }}
      autoCorrect={composerAutocorrect({
        enabled: autocorrect,
        text: prompt.text,
        triggerActive: found !== null,
      })}
      onSend={() => void send()}
      sending={prompt.sending}
      disabled={disabled}
      error={prompt.error}
      agent={agent}
      onSendNow={() => void send('now')}
      hint={queueing ? t('queue.holdHint') : null}
      submit={submit}
      onSubmit={onSubmit}
      returnKeySends={returnSends && !hardware}
      onFocusChange={setFocused}
      hints={
        hardware
          ? keyboardHints({ pendingPermission: pendingPermissions > 0, tablet, os: Platform.OS }, t)
          : undefined
      }
      onKey={prompt.sendKey}
      keysDisabled={disabled}
      onTrigger={(trigger) => {
        const next = insertTrigger(prompt.text, cursor, trigger)
        if (next) insert(next)
      }}
      accessory={
        trigger ? (
          <SuggestionList
            suggestions={suggestions}
            highlighted={submit ? rows[highlighted] : undefined}
            onPickFile={(item) => insert(applySuggestion(prompt.text, trigger, { kind: 'file', item }))}
            onPickCommand={(item) => insert(applySuggestion(prompt.text, trigger, { kind: 'command', item }))}
          />
        ) : voice.state !== 'idle' ? (
          <RecordingOverlay
            state={voice.state}
            level={voice.level}
            elapsedMs={voice.elapsedMs}
            interimText={voice.interimText}
            review={voice.review}
            onCancel={voice.cancel}
            onDone={voice.stop}
            onPause={voice.pause}
            onResume={() => void voice.resume()}
            onRetryOnline={() => void voice.retryOnline()}
            onUseOriginal={voice.useOriginal}
            onUsePolished={voice.usePolished}
          />
        ) : null
      }
      hasAttachments={prompt.attachments.length > 0}
      voiceActive={voice.state !== 'idle'}
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
          pushToTalk={pushToTalk}
          onStart={() => void voice.start()}
          onStop={voice.stop}
        />
      }
    />
  )
}
