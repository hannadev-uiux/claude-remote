import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { Text } from './Text'

/** Dashed neutral chip naming a model provider (`via OpenRouter`): a provider never gets a color of its own. */
export function ProviderChip({ provider }: { provider: string }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const label = t('providers.via', { provider })
  return (
    <View style={styles.chip} accessible accessibilityLabel={label}>
      <Text size="xs" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  chip: {
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
