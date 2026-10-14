import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Folder } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { selectProfiles, useConnectionStore, useDaemonClient, useIsConnected } from '@/core/connection'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { Button, Card, Screen, Text } from '@/ui'

export function NewSessionScreen() {
  const client = useDaemonClient()
  const connected = useIsConnected()
  const profiles = useConnectionStore(selectProfiles)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId && profiles[0]) setProfileId(profiles[0].id)
  }, [profileId, profiles])

  const projects = useQuery({
    queryKey: ['projects', profileId],
    enabled: Boolean(client && connected && profileId),
    queryFn: async () => {
      const reply = await client!.request({ type: 'projects.list', profileId: profileId! })
      return reply.type === 'projects.results' ? reply.items : []
    },
  })

  const start = async () => {
    if (!client || !profileId || !cwd.trim()) return
    setBusy(true)
    setError(null)
    try {
      await client.request({ type: 'session.start', profileId, cwd: cwd.trim() })
      router.back()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text size="xs" color="textMuted">
          perfil
        </Text>
        <View style={styles.row}>
          {profiles.map((p) => (
            <Button
              key={p.id}
              label={p.name}
              compact
              variant={p.id === profileId ? 'primary' : 'secondary'}
              onPress={() => setProfileId(p.id)}
            />
          ))}
        </View>

        <Text size="xs" color="textMuted">
          diretório
        </Text>
        <TextInput
          value={cwd}
          onChangeText={setCwd}
          placeholder="~/workspaces/projeto"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Button
          label="Iniciar sessão"
          variant="primary"
          loading={busy}
          disabled={!cwd.trim() || !profileId}
          onPress={() => void start()}
        />
        {error ? (
          <Card accent={colors.danger}>
            <Text color="danger" size="sm">
              {error}
            </Text>
          </Card>
        ) : null}

        <Text size="xs" color="textMuted" style={styles.section}>
          recentes
        </Text>
        {(projects.data ?? []).map((p) => (
          <Pressable
            key={p.cwd}
            onPress={() => setCwd(p.cwd)}
            style={({ pressed }) => [
              styles.project,
              pressed && styles.pressed,
              p.cwd === cwd && styles.selected,
            ]}
          >
            <Folder size={16} color={colors.info} />
            <Text size="sm" style={styles.flex} numberOfLines={1}>
              {shortPath(p.cwd)}
            </Text>
            <Text size="xs" color="textDim">
              {relativeTime(p.lastUsedAt)}
            </Text>
          </Pressable>
        ))}
        {projects.data?.length === 0 ? (
          <Text size="sm" color="textDim">
            Nenhum diretório recente neste perfil.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  section: { marginTop: space.lg },
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  selected: { borderColor: colors.accent },
  flex: { flex: 1 },
})
