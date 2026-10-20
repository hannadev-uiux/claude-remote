import type { Key } from '@remote-harness/protocol'
import * as Haptics from 'expo-haptics'
import { ArrowUp } from 'lucide-react-native'
import { forwardRef, type ReactNode, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, Pressable, TextInput, type TextInputProps, View } from 'react-native'
import Animated, { LayoutAnimationConfig, ReduceMotion, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { useKeyboardHeight } from '@/core/platform/use-keyboard-height'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import type { AgentId } from '@/core/theme/agents'
import { Text } from '@/ui'
import { composerActions } from '../composer-actions'
import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT, composerHeight } from '../composer-height'
import { composerPlaceholder } from '../composer-placeholder'
import type { KeyboardHint } from '../keyboard-hints'
import { keyboardToolbar } from '../keyboard-toolbar'
import { hideKeyBar, releaseKeyBar, useKeyboardToolbarStore } from '../keyboard-toolbar-store'
import { KeyboardHints } from './KeyboardHints'
import { KeyboardToolbar } from './KeyboardToolbar'

type Props = {
  value: string
  onChangeText: (text: string) => void
  onSelectionChange?: TextInputProps['onSelectionChange']
  selection?: TextInputProps['selection']
  onSend: () => void
  sending: boolean
  disabled: boolean
  error: string | null
  /** Rendered above the input (autocomplete suggestions, the voice recording overlay). */
  accessory?: ReactNode
  /** Rendered between the input and the send button (the voice mic button). */
  voiceButton?: ReactNode
  /** Rendered before the voice button (the attach photos button). */
  attachButton?: ReactNode
  /** Photos waiting to be sent, shown above the input. */
  attachments?: ReactNode
  /** Photos alone are enough to send. */
  hasAttachments?: boolean
  /** A recording is running or being transcribed: the voice button stays to stop it. */
  voiceActive?: boolean
  /** Sends a special key; with it, a toolbar with the keys is attached to the keyboard. */
  onKey?: (key: Key) => void
  keysDisabled?: boolean
  /** The session's agent, named in the placeholder when known. */
  agent?: AgentId | null
  /** Long press on Send: paste mid-turn instead of queueing (Claude Code's Ctrl+Enter). */
  onSendNow?: () => void
  /** Shown over the send button while the prompt would be queued (`Hold: send now · ⌘⏎`). */
  hint?: string | null
  /** Return calls `onSubmit` instead of inserting a newline (hardware keyboard, or "Return key sends"). */
  submit?: boolean
  onSubmit?: () => void
  /** The on-screen keyboard's return key reads Send ("Return key sends" without a hardware keyboard). */
  returnKeySends?: boolean
  /** Shortcut hints shown under the field (only passed while a hardware keyboard is in use). */
  hints?: KeyboardHint[]
  onFocusChange?: (focused: boolean) => void
  /** Inserts `@` or `/` from the keyboard toolbar; without it the toolbar shows no trigger buttons. */
  onTrigger?: (trigger: '@' | '/') => void
}

// Subtle swap between attach/mic and Send; instant when the system asks for reduced motion.
const SWAP_MS = 150
const entering = ZoomIn.duration(SWAP_MS).reduceMotion(ReduceMotion.System)
const exiting = ZoomOut.duration(SWAP_MS).reduceMotion(ReduceMotion.System)
// The content size reported on iOS leaves out the input's borders (1 pt each side); Android's includes them.
const CONTENT_EXTRA = Platform.OS === 'ios' ? 2 : 0

export const PromptComposer = forwardRef<TextInput, Props>(function PromptComposer(props, ref) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const hasText = props.value.trim().length > 0
  const placeholder = composerPlaceholder(props.agent ?? null, props.disabled, t)
  const hasAttachments = props.hasAttachments === true
  const canSend = !props.disabled && !props.sending && (hasText || hasAttachments)
  const show = composerActions({
    hasText,
    hasAttachments,
    voiceActive: props.voiceActive === true,
    sending: props.sending,
    hasAttach: props.attachButton != null,
    hasVoice: props.voiceButton != null,
  })
  const [focused, setFocused] = useState(false)
  // Sized explicitly: the native multiline input keeps its old height when a send clears it from code.
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const height = composerHeight(props.value, contentHeight, CONTENT_EXTRA)
  const keyboardHeight = useKeyboardHeight()
  const expanded = useKeyboardToolbarStore((s) => s.expanded)
  const toolbar = keyboardToolbar({ os: Platform.OS, focused, keyboardHeight, expanded })
  const hidesKeyBar = props.onKey != null && toolbar.hideKeyBar
  const [owner] = useState(() => Symbol('composer'))
  // Layout effect: the key bar under the conversation leaves in the same frame the toolbar's keys
  // appear, so the keys are never shown twice.
  useLayoutEffect(() => {
    if (!hidesKeyBar) return
    hideKeyBar(owner)
    return () => releaseKeyBar(owner)
  }, [hidesKeyBar, owner])
  return (
    <View style={styles.wrap}>
      {props.accessory}
      {props.error ? (
        <Text size="xs" color="danger" style={styles.error}>
          {props.error}
        </Text>
      ) : null}
      {props.attachments}
      {props.hint && hasText ? (
        <Text size="xs" color="textDim" style={styles.hint}>
          {props.hint}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text color="accentText" weight="bold" style={styles.prompt}>
          {'>'}
        </Text>
        <View style={styles.field}>
          <TextInput
            ref={ref}
            value={props.value}
            onChangeText={props.onChangeText}
            onSelectionChange={props.onSelectionChange}
            onContentSizeChange={(e) => setContentHeight(e.nativeEvent.contentSize.height)}
            selection={props.selection}
            onFocus={() => {
              setFocused(true)
              props.onFocusChange?.(true)
            }}
            onBlur={() => {
              setFocused(false)
              props.onFocusChange?.(false)
            }}
            editable={!props.disabled}
            multiline
            submitBehavior={props.submit ? 'submit' : 'newline'}
            onSubmitEditing={props.submit ? props.onSubmit : undefined}
            returnKeyType={props.returnKeySends ? 'send' : 'default'}
            accessibilityLabel={placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { height }]}
          />
          {/* A multiline input wraps its native placeholder; this one stays on one line. */}
          {props.value ? null : (
            <Text
              color="textDim"
              numberOfLines={1}
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={styles.placeholder}
            >
              {placeholder}
            </Text>
          )}
        </View>
        {/* Only swaps animate: the buttons present when the screen opens just appear. */}
        <LayoutAnimationConfig skipEntering>
          {show.attach ? (
            <Animated.View key="attach" entering={entering} exiting={exiting}>
              {props.attachButton}
            </Animated.View>
          ) : null}
          {show.voice ? (
            <Animated.View key="voice" entering={entering} exiting={exiting}>
              {props.voiceButton}
            </Animated.View>
          ) : null}
          {show.send ? (
            <Animated.View key="send" entering={entering} exiting={exiting}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={props.hint ? t('queue.queueLabel') : t('common.send')}
                accessibilityHint={props.hint ?? undefined}
                accessibilityState={{ disabled: !canSend, busy: props.sending }}
                hitSlop={6}
                disabled={!canSend}
                onPress={props.onSend}
                onLongPress={
                  props.onSendNow
                    ? () => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        props.onSendNow?.()
                      }
                    : undefined
                }
                delayLongPress={400}
                style={[styles.send, { backgroundColor: canSend ? colors.accent : colors.surfaceRaised }]}
              >
                {props.sending ? (
                  <ActivityIndicator size="small" color={colors.accentInk} />
                ) : (
                  <ArrowUp size={18} color={canSend ? colors.accentInk : colors.textDim} />
                )}
              </Pressable>
            </Animated.View>
          ) : null}
        </LayoutAnimationConfig>
      </View>
      {props.hints && props.hints.length > 0 ? <KeyboardHints hints={props.hints} /> : null}
      {props.onKey && toolbar.visible ? (
        <KeyboardToolbar
          onKey={props.onKey}
          keysDisabled={props.keysDisabled}
          canDismiss={toolbar.canDismiss}
          onTrigger={props.onTrigger}
          commandEnabled={!hasText}
        />
      ) : null}
    </View>
  )
})

const useStyles = makeStyles((theme) => ({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm },
  prompt: { paddingBottom: 9 },
  field: { flex: 1 },
  input: {
    maxHeight: COMPOSER_MAX_HEIGHT,
    minHeight: COMPOSER_MIN_HEIGHT,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  // Over the empty input, where the native placeholder would be (padding + border).
  placeholder: {
    position: 'absolute',
    left: space.sm + 1,
    right: space.sm + 1,
    top: 9,
    pointerEvents: 'none',
  },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  error: { paddingHorizontal: space.md, paddingTop: space.xs },
  hint: { alignSelf: 'flex-end', paddingHorizontal: space.md, paddingTop: space.xs },
}))
