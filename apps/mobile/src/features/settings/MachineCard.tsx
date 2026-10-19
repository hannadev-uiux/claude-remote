import { router } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConnectionStore } from '@/core/connection'
import { credentialsStorage } from '@/core/storage/credentials'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { Badge, Button, Card, IconButton, Text } from '@/ui'
import { clearAllDrafts } from '../drafts/persistence'
import { setMachineAlias, useMachineName, useMachineStore } from './machine-store'
import { machineMeta } from './summary'

/**
 * Settings → Machine: the connection pill, the name (alias or hostname, editable), one line with
 * address, daemon version and protocol, and Forget this machine.
 */
export function MachineCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const credentials = useConnectionStore((s) => s.credentials)
  const hello = useConnectionStore((s) => s.hello)
  const status = useConnectionStore((s) => s.status)
  const setCredentials = useConnectionStore((s) => s.setCredentials)
  const name = useMachineName()
  const alias = useMachineStore((s) => s.alias)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const meta = machineMeta(
    {
      host: credentials?.host,
      port: credentials?.port,
      daemonVersion: hello?.daemonVersion,
      protocolVersion: hello?.protocolVersion,
    },
    t,
  )

  const forget = () => {
    Alert.alert(t('settings.forgetTitle'), t('settings.forgetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.forget'),
        style: 'destructive',
        onPress: async () => {
          await credentialsStorage.clear()
          await clearAllDrafts()
          setCredentials(null)
          router.replace('/pair')
        },
      },
    ])
  }

  return (
    <Card>
      <View style={layout.gap}>
        <View style={layout.between}>
          <Text weight="bold">{t('settings.machine')}</Text>
          <Badge
            label={t(`connection.status.${status}`)}
            tone={status === 'open' ? 'success' : 'warning'}
            dot
          />
        </View>
        <View style={layout.between}>
          <Text size="lg" weight="bold" numberOfLines={1} style={layout.flex}>
            {name ?? hello?.host ?? '—'}
          </Text>
          <IconButton
            icon={Pencil}
            size={16}
            label={t('settings.editName')}
            onPress={() => {
              setDraft(alias ?? '')
              setEditing(true)
            }}
          />
        </View>
        {meta ? (
          <Text size="xs" color="textMuted" selectable>
            {meta}
          </Text>
        ) : null}
        <Button label={t('settings.forgetButton')} variant="danger" compact onPress={forget} />
      </View>
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
            <Text weight="bold" accessibilityRole="header">
              {t('settings.nameTitle')}
            </Text>
            <Text size="xs" color="textMuted">
              {t('settings.nameHint', { host: hello?.host ?? '—' })}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              autoCorrect={false}
              placeholder={hello?.host ?? ''}
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            <View style={layout.actions}>
              <Button label={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
              <Button
                label={t('settings.save')}
                variant="primary"
                onPress={() => {
                  void setMachineAlias(draft)
                  setEditing(false)
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  )
}

const layout = StyleSheet.create({
  gap: { gap: space.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
})

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
}))
