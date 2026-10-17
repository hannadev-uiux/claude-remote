import { ArrowUp } from 'lucide-react-native'
import { forwardRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native'
import Animated, { LayoutAnimationConfig, ReduceMotion, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { composerActions } from '../composer-actions'

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
}

// Subtle swap between attach/mic and Send; instant when the system asks for reduced motion.
const SWAP_MS = 150
const entering = ZoomIn.duration(SWAP_MS).reduceMotion(ReduceMotion.System)
const exiting = ZoomOut.duration(SWAP_MS).reduceMotion(ReduceMotion.System)

export const PromptComposer = forwardRef<TextInput, Props>(function PromptComposer(props, ref) {
  const { t } = useTranslation()
  const hasText = props.value.trim().length > 0
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
  return (
    <View style={styles.wrap}>
      {props.accessory}
      {props.error ? (
        <Text size="xs" color="danger" style={styles.error}>
          {props.error}
        </Text>
      ) : null}
      {props.attachments}
      <View style={styles.row}>
        <Text color="accent" weight="bold" style={styles.prompt}>
          {'>'}
        </Text>
        <TextInput
          ref={ref}
          value={props.value}
          onChangeText={props.onChangeText}
          onSelectionChange={props.onSelectionChange}
          selection={props.selection}
          editable={!props.disabled}
          multiline
          placeholder={props.disabled ? t('conversation.placeholderReadOnly') : t('conversation.placeholder')}
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
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
                accessibilityLabel={t('common.send')}
                accessibilityState={{ disabled: !canSend, busy: props.sending }}
                hitSlop={6}
                disabled={!canSend}
                onPress={props.onSend}
                style={[styles.send, { backgroundColor: canSend ? colors.accent : colors.surfaceRaised }]}
              >
                {props.sending ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <ArrowUp size={18} color={canSend ? colors.background : colors.textDim} />
                )}
              </Pressable>
            </Animated.View>
          ) : null}
        </LayoutAnimationConfig>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm },
  prompt: { paddingBottom: 9 },
  input: {
    flex: 1,
    maxHeight: 140,
    minHeight: 36,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  error: { paddingHorizontal: space.md, paddingTop: space.xs },
})
