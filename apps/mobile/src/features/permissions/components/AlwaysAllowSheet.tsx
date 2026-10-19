import type { PermissionRequestInfo, RuleScope } from '@remote-harness/protocol'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Modal, TextInput, View } from 'react-native'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { Button, Card, Text } from '@/ui'

type Props = {
  request: PermissionRequestInfo | null
  cwd: string
  profileName: string
  onCancel: () => void
  onConfirm: (always: { rule: string; scope: RuleScope }) => void
}

/** Shows the exact rule and scope before writing an always-allow rule. */
export function AlwaysAllowSheet({ request, cwd, profileName, onCancel, onConfirm }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const [rule, setRule] = useState('')
  const [scope, setScope] = useState<RuleScope>('project')

  useEffect(() => {
    if (!request) return
    setRule(request.suggestedRule ?? request.tool)
    setScope(request.defaultScope)
  }, [request])

  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.sheet}>
        <Text size="lg" weight="bold">
          {t('permissions.alwaysSheet.title')}
        </Text>
        <Text color="textMuted" size="sm">
          <Trans i18nKey="permissions.alwaysSheet.intro" components={{ code: <Text color="accentText" /> }} />
        </Text>

        <View style={styles.field}>
          <Text size="xs" color="textMuted">
            {t('permissions.alwaysSheet.rule')}
          </Text>
          <TextInput
            value={rule}
            onChangeText={setRule}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <Text size="xs" color="textMuted">
          {t('permissions.alwaysSheet.scope')}
        </Text>
        <View style={styles.scopes}>
          <ScopeOption
            selected={scope === 'project'}
            title={t('permissions.alwaysSheet.project')}
            detail={`${shortPath(cwd)}/.claude/settings.local.json`}
            onPress={() => setScope('project')}
          />
          <ScopeOption
            selected={scope === 'profile'}
            title={t('permissions.alwaysSheet.profile', { name: profileName })}
            detail={t('permissions.alwaysSheet.profileDetail')}
            onPress={() => setScope('profile')}
          />
        </View>

        <View style={styles.actions}>
          <Button label={t('common.cancel')} flex onPress={onCancel} />
          <Button
            label={t('permissions.alwaysSheet.confirm')}
            variant="primary"
            flex
            disabled={!rule.trim()}
            onPress={() => onConfirm({ rule: rule.trim(), scope })}
          />
        </View>
      </View>
    </Modal>
  )
}

function ScopeOption(props: { selected: boolean; title: string; detail: string; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Card accent={props.selected ? colors.accent : undefined} style={styles.option}>
      <Button
        label={props.selected ? `● ${props.title}` : `○ ${props.title}`}
        variant="ghost"
        onPress={props.onPress}
      />
      <Text size="xs" color="textDim">
        {props.detail}
      </Text>
    </Card>
  )
}

const useStyles = makeStyles((theme) => ({
  sheet: { flex: 1, backgroundColor: theme.colors.background, padding: space.xl, gap: space.md },
  field: { gap: space.xs },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  scopes: { gap: space.sm },
  option: { gap: space.xs, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: 'auto' },
}))
