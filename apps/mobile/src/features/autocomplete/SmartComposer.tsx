import { router } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import type { TextInput } from 'react-native'
import { PromptComposer } from '../conversation/components/PromptComposer'
import type { usePrompt } from '../conversation/use-prompt'
import { SuggestionList } from './SuggestionList'
import { applySuggestion, findTrigger, isInteractiveCommand } from './trigger'
import { useCommands, useSuggestions } from './use-suggestions'

type Props = { sessionId: string; prompt: ReturnType<typeof usePrompt>; disabled: boolean }

/** Prompt composer with `@` file and `/` command suggestions. */
export function SmartComposer({ sessionId, prompt, disabled }: Props) {
  const input = useRef<TextInput>(null)
  const [cursor, setCursor] = useState(0)
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>()
  const trigger = useMemo(
    () => (disabled ? null : findTrigger(prompt.text, cursor)),
    [prompt.text, cursor, disabled],
  )
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

  const send = async () => {
    const text = prompt.text
    const interactive = isInteractiveCommand(text, commands.data ?? [])
    const ok = await prompt.send()
    // Menus like /model only exist in the TUI: show the raw terminal to drive them.
    if (interactive && ok) router.push({ pathname: '/session/[id]/terminal', params: { id: sessionId } })
  }

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
        ) : null
      }
    />
  )
}
