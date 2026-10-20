import { PROVIDER_NAMES, type ProviderKind } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { agentIconFor } from './agent-icons'
import { Text } from './Text'

/** Dashed neutral chip naming a model provider (`via OpenRouter`): a provider never gets a color of its own. */
export function ProviderChip({ kind }: { kind: ProviderKind }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const name = PROVIDER_NAMES[kind]
  const label = t('providers.via', { provider: name })
  const Icon = agentIconFor(kind)
  return (
    <View style={styles.chip} accessible accessibilityLabel={label}>
      {Icon ? <Icon size={12} color={colors.textMuted} /> : null}
      <Text size="xs" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
}))
