import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TextInput } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { useBackHandler } from '@/core/platform/use-back-handler'
import { PromptComposer } from '../conversation/components/PromptComposer'
import type { usePrompt } from '../conversation/use-prompt'
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

  const send = async () => {
    const text = prompt.text
    const interactive = isInteractiveCommand(text, commands.data ?? [])
    const ok = await prompt.send()
    // Menus like /model only exist in the TUI: show the raw terminal to drive them.
    if (interactive && ok) router.push({ pathname: '/session/[id]/terminal', params: { id: sessionId } })
  }

  const canSendRef = useRef(false)
  canSendRef.current = !disabled && !prompt.sending && prompt.text.trim().length > 0
  const sendRef = useRef(send)
  sendRef.current = send

  // Hardware keyboard: Cmd+Enter sends; plain Enter already inserts a newline by default on TextInput.
  useEffect(() => {
    return addListener(
      { input: constants.keyInputEnter, modifierFlags: constants.keyModifierCommand },
      () => {
        if (canSendRef.current) void sendRef.current()
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
