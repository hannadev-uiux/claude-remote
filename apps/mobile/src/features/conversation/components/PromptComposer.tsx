import { ArrowUp } from 'lucide-react-native'
import { forwardRef, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
import { Text } from '@/ui'

type Props = {
  value: string
  onChangeText: (text: string) => void
  onSelectionChange?: TextInputProps['onSelectionChange']
  selection?: TextInputProps['selection']
  onSend: () => void
  sending: boolean
  disabled: boolean
  error: string | null
  /** Rendered above the input (autocomplete suggestions). */
  accessory?: ReactNode
}

export const PromptComposer = forwardRef<TextInput, Props>(function PromptComposer(props, ref) {
  const canSend = !props.disabled && !props.sending && props.value.trim().length > 0
  return (
    <View style={styles.wrap}>
      {props.accessory}
      {props.error ? (
        <Text size="xs" color="danger" style={styles.error}>
          {props.error}
        </Text>
      ) : null}
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
          placeholder={
            props.disabled ? 'sessão somente leitura' : 'mensagem para o Claude… (@ arquivos, / comandos)'
          }
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          accessibilityLabel="Enviar"
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
