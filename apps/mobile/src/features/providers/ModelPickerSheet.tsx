import type { ModelInfo } from '@remote-harness/protocol'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { relativeTime } from '@/core/utils/time'
import { Button, Text } from '@/ui'
import {
  creditsLeft,
  filterModels,
  formatCredits,
  modelCapabilities,
  modelDetail,
  modelWarnings,
} from './logic'
import { useModels, useProviderStatus } from './use-provider'

/**
 * Searchable list of the profile's provider models (id, context and prices, capabilities, warnings
 * for models Claude Code may not work with) with the credits left and the catalog's age in the
 * footer. New session picks the start model with it; the session menu switches a running session.
 */
export function ModelPickerSheet({
  visible,
  profileId,
  selected,
  onChoose,
  onClose,
}: {
  visible: boolean
  profileId: string
  selected: string | null
  onChoose: (modelId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (visible) setQuery('')
  }, [visible])
  const models = useModels(visible ? profileId : null)
  const status = useProviderStatus(visible ? profileId : null)
  const items = models.data ? filterModels(models.data.models, query) : []
  const left = creditsLeft(status.data?.credits)
  const footer =
    status.data && !status.data.hasKey
      ? t('modelPicker.noKey', { profile: profileId })
      : [
          left !== null ? t('modelPicker.credits', { amount: formatCredits(left) }) : null,
          models.data
            ? t(models.data.stale ? 'modelPicker.fetchedStale' : 'modelPicker.fetched', {
                time: relativeTime(models.data.fetchedAt, t),
              })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('modelPicker.title')}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('modelPicker.search')}
            placeholderTextColor={colors.textDim}
            accessibilityLabel={t('modelPicker.search')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Text size="xs" color="textDim">
            {t('modelPicker.pricesHint')}
          </Text>
          {models.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : models.isError ? (
            <View style={styles.center}>
              <Text size="sm" color="danger" style={styles.centerText}>
                {t('modelPicker.error')}
              </Text>
              <Button
                label={t('modelPicker.retry')}
                variant="secondary"
                compact
                onPress={() => void models.refetch()}
              />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(model) => model.id}
              style={styles.list}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text size="sm" color="textDim" style={styles.centerText}>
                  {t('modelPicker.empty')}
                </Text>
              }
              renderItem={({ item }) => (
                <ModelRow model={item} selected={item.id === selected} onPress={() => onChoose(item.id)} />
              )}
            />
          )}
          {footer ? (
            <Text size="xs" color="textMuted" numberOfLines={2}>
              {footer}
            </Text>
          ) : null}
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ModelRow({
  model,
  selected,
  onPress,
}: {
  model: ModelInfo
  selected: boolean
  onPress: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const detail = modelDetail(model, t)
  const capabilities = modelCapabilities(model, t)
  const warnings = modelWarnings(model, t)
  const line = [detail, capabilities].filter(Boolean).join(' · ')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text size="sm" weight="medium" numberOfLines={1}>
        {model.id}
      </Text>
      {model.name !== model.id ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {model.name}
        </Text>
      ) : null}
      {line ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {line}
        </Text>
      ) : null}
      {warnings.map((warning) => (
        <Text key={warning} size="xs" color="warning" numberOfLines={1}>
          {warning}
        </Text>
      ))}
    </Pressable>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    height: '85%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  list: { flex: 1 },
  content: { gap: space.xs, paddingVertical: space.sm },
  row: {
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  selected: { borderColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  centerText: { textAlign: 'center', padding: space.md },
}))
