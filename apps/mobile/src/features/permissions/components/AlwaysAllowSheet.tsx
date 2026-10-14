import type { PermissionRequestInfo, RuleScope } from '@claude-remote/protocol'
import { useEffect, useState } from 'react'
import { Modal, StyleSheet, TextInput, View } from 'react-native'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
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
          Permitir sempre
        </Text>
        <Text color="textMuted" size="sm">
          A regra abaixo será gravada em <Text color="accent">permissions.allow</Text>. Pedidos que casarem
          com ela não vão mais perguntar.
        </Text>

        <View style={styles.field}>
          <Text size="xs" color="textMuted">
            regra
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
          escopo
        </Text>
        <View style={styles.scopes}>
          <ScopeOption
            selected={scope === 'project'}
            title="Projeto"
            detail={`${shortPath(cwd)}/.claude/settings.local.json`}
            onPress={() => setScope('project')}
          />
          <ScopeOption
            selected={scope === 'profile'}
            title={`Perfil ${profileName}`}
            detail="settings.json do perfil — todas as sessões dele"
            onPress={() => setScope('profile')}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Cancelar" flex onPress={onCancel} />
          <Button
            label="Gravar e permitir"
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

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background, padding: space.xl, gap: space.md },
  field: { gap: space.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  scopes: { gap: space.sm },
  option: { gap: space.xs, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: 'auto' },
})
