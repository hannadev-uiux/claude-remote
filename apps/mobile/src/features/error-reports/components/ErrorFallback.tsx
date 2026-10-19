import type { ErrorBoundaryProps } from 'expo-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space, useTheme } from '@/core/theme'
import { Button, Text } from '@/ui'
import { recordError } from '../capture'

/** Shown instead of a screen that threw while rendering; the error goes to the on-device log. */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  useEffect(() => {
    recordError('render', error)
  }, [error])
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text weight="bold" size="lg">
        {t('errorReports.fallback.title')}
      </Text>
      <Text size="sm" color="textMuted" style={styles.center}>
        {t('errorReports.fallback.body')}
      </Text>
      <Button label={t('errorReports.fallback.retry')} variant="primary" onPress={() => void retry()} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  center: { textAlign: 'center' },
})
