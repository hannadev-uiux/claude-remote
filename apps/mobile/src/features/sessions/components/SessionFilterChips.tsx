import type { Profile } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { makeStyles, space } from '@/core/theme'
import { Chip } from '@/ui'
import type { SessionFilter, SessionSort, StateFilter } from '../filter'

/**
 * Profile, active/ended and sort chips — shared by the header's horizontal row and the compact
 * bar's filters sheet, so the two layouts can't drift apart.
 */
export function SessionFilterChips({
  profiles,
  filter,
  sort,
  onChangeFilter,
  onToggleState,
  onChangeSort,
}: {
  profiles: readonly Pick<Profile, 'id' | 'name'>[]
  filter: SessionFilter
  sort: SessionSort
  onChangeFilter: (patch: Partial<SessionFilter>) => void
  onToggleState: (state: Exclude<StateFilter, 'all'>) => void
  onChangeSort: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  return (
    <>
      {profiles.length > 1 ? (
        <>
          <Chip
            label={t('sessions.all')}
            selected={filter.profileId === null}
            onPress={() => onChangeFilter({ profileId: null })}
          />
          {profiles.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={filter.profileId === p.id}
              onPress={() => onChangeFilter({ profileId: filter.profileId === p.id ? null : p.id })}
            />
          ))}
          <View style={styles.divider} />
        </>
      ) : null}
      <Chip
        label={t('sessions.active')}
        selected={filter.state === 'active'}
        onPress={() => onToggleState('active')}
      />
      <Chip
        label={t('sessions.ended')}
        selected={filter.state === 'ended'}
        onPress={() => onToggleState('ended')}
      />
      <View style={styles.divider} />
      <Chip ghost label={`${t(`sessions.sort.${sort}`)} ▾`} onPress={onChangeSort} />
    </>
  )
}

const useStyles = makeStyles((theme) => ({
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
    marginHorizontal: space.xs,
  },
}))
