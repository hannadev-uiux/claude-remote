import { Check, Copy } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import { radius, useTheme } from '@/core/theme'
import { copyText, useCopied } from '../copy-text'

/** Small dim copy icon that turns into a check for a moment after copying `value`. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { copied, flash } = useCopied()
  const Icon = copied ? Check : Copy

  const copy = async () => {
    if (await copyText(value, t('conversation.copy.copied'))) flash()
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => void copy()}
      style={({ pressed }) => [styles.base, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon size={14} color={copied ? colors.success : colors.textDim} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { padding: 4, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
})
