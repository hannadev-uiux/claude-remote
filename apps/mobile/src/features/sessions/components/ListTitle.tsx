import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Mark, Text } from '@/ui'

/** The mark and "Sessions": the title of the list, in the stack header and in the iPad sidebar. */
export function ListTitle() {
  const { t } = useTranslation()
  return (
    <View style={styles.row}>
      <Mark size={22} />
      <Text weight="bold" size="lg" numberOfLines={1}>
        {t('sessions.title')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.sm } })
