import type { Profile } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import type { SessionFilter, SessionSort, StateFilter } from '../filter'
import { SessionFilterChips } from './SessionFilterChips'

/** The compact bar's filters button opens this: the same chips as the full header's row, wrapped. */
export function SessionFiltersSheet({
  visible,
  profiles,
  filter,
  sort,
  onChangeFilter,
  onToggleState,
  onChangeSort,
  onClose,
}: {
  visible: boolean
  profiles: readonly Pick<Profile, 'id' | 'name'>[]
  filter: SessionFilter
  sort: SessionSort
  onChangeFilter: (patch: Partial<SessionFilter>) => void
  onToggleState: (state: Exclude<StateFilter, 'all'>) => void
  onChangeSort: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" style={styles.title}>
            {t('sessions.filters')}
          </Text>
          <View style={styles.chips}>
            <SessionFilterChips
              profiles={profiles}
              filter={filter}
              sort={sort}
              onChangeFilter={onChangeFilter}
              onToggleState={onToggleState}
              onChangeSort={onChangeSort}
            />
          </View>
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { paddingBottom: space.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
}))
