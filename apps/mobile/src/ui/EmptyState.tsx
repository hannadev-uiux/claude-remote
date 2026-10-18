import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Text } from './Text'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.base}>
      <Text size="lg" weight="bold" color="accentText">
        {'>_ '}
        <Text size="lg" weight="bold">
          {title}
        </Text>
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({ base: { padding: space.xl, gap: space.md } })
