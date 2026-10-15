import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronRight, Keyboard, QrCode, Rocket } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { keyboardBehavior } from '@/core/platform/platform'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
import { Button, Card, Screen, Text } from '@/ui'
import { parseCredentials, parsePairingUrl } from './parse-pairing-url'
import { usePairing } from './use-pairing'

type Mode = 'scan' | 'manual'

export function PairScreen() {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ host?: string; port?: string; token?: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>('scan')
  const { pair, busy, error, setError } = usePairing()
  const locked = useRef(false)

  // Opened through a `claude-remote://pair?...` link (e.g. scanned with the iOS Camera app).
  useEffect(() => {
    const fromLink = parseCredentials(params)
    if (fromLink && !locked.current) {
      locked.current = true
      void pair(fromLink).then(() => {
        locked.current = false
      })
    }
  }, [params, pair])

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (locked.current || busy) return
    const credentials = parsePairingUrl(data)
    if (!credentials) {
      setError(t('pairing.invalidQr'))
      return
    }
    locked.current = true
    void pair(credentials).finally(() => {
      locked.current = false
    })
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={keyboardBehavior(Platform.OS)} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text size="xl" weight="bold">
            <Text size="xl" weight="bold" color="accent">
              {'> '}
            </Text>
            {t('pairing.title')}
          </Text>
          <Text color="textMuted">
            <Trans i18nKey="pairing.intro" components={{ cmd: <Text color="accent" /> }} />
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pairing.guideTitle')}
            onPress={() => router.push('/setup-guide')}
          >
            <Card accent={colors.accent}>
              <View style={styles.guide}>
                <Rocket size={20} color={colors.accent} />
                <View style={styles.flex}>
                  <Text weight="bold">{t('pairing.guideTitle')}</Text>
                  <Text size="sm" color="textMuted">
                    {t('pairing.guideHint')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </View>
            </Card>
          </Pressable>

          <View style={styles.tabs}>
            <Button
              label={t('pairing.tabQr')}
              compact
              flex
              variant={mode === 'scan' ? 'primary' : 'secondary'}
              icon={<QrCode size={16} color={mode === 'scan' ? colors.background : colors.text} />}
              onPress={() => setMode('scan')}
            />
            <Button
              label={t('pairing.tabManual')}
              compact
              flex
              variant={mode === 'manual' ? 'primary' : 'secondary'}
              icon={<Keyboard size={16} color={mode === 'manual' ? colors.background : colors.text} />}
              onPress={() => setMode('manual')}
            />
          </View>

          {mode === 'scan' ? (
            <Scanner
              granted={permission?.granted ?? false}
              canAsk={permission?.canAskAgain ?? true}
              onRequest={() => void requestPermission()}
              onManual={() => setMode('manual')}
              onScanned={onScanned}
              busy={busy}
            />
          ) : (
            <ManualForm
              busy={busy}
              onSubmit={(c) => void pair(c)}
              onInvalid={() => setError(t('pairing.invalidManual'))}
            />
          )}

          {error ? (
            <Card accent={colors.danger}>
              <Text color="danger">{error}</Text>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function Scanner(props: {
  granted: boolean
  canAsk: boolean
  busy: boolean
  onRequest: () => void
  onManual: () => void
  onScanned: (result: BarcodeScanningResult) => void
}) {
  const { t } = useTranslation()
  if (!props.granted) {
    return (
      <Card>
        <View style={styles.gap}>
          <Text color="textMuted">{t('pairing.cameraRationale')}</Text>
          {props.canAsk ? (
            <Button label={t('pairing.allowCamera')} variant="primary" onPress={props.onRequest} />
          ) : (
            <Button label={t('pairing.typeManually')} onPress={props.onManual} />
          )}
        </View>
      </Card>
    )
  }
  return (
    <View style={styles.cameraFrame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={props.busy ? undefined : props.onScanned}
      />
      <View style={styles.reticle} pointerEvents="none" />
      {props.busy ? (
        <View style={styles.overlay}>
          <Text color="accent">{t('pairing.connecting')}</Text>
        </View>
      ) : null}
    </View>
  )
}

function ManualForm({
  busy,
  onSubmit,
  onInvalid,
}: {
  busy: boolean
  onSubmit: (credentials: { host: string; port: number; token: string }) => void
  onInvalid: () => void
}) {
  const { t } = useTranslation()
  const [host, setHost] = useState('')
  const [port, setPort] = useState('7337')
  const [token, setToken] = useState('')
  const submit = () => {
    const credentials = parseCredentials({ host, port, token })
    if (credentials) onSubmit(credentials)
    else onInvalid()
  }
  return (
    <Card>
      <View style={styles.gap}>
        <Field label={t('pairing.host')} value={host} onChangeText={setHost} placeholder="100.x.y.z" />
        <Field label={t('pairing.port')} value={port} onChangeText={setPort} keyboardType="number-pad" />
        <Field label={t('pairing.token')} value={token} onChangeText={setToken} secure />
        <Button label={t('pairing.connect')} variant="primary" loading={busy} onPress={submit} />
      </View>
    </Card>
  )
}

function Field(props: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'number-pad'
  secure?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text size="xs" color="textMuted">
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={props.keyboardType}
        secureTextEntry={props.secure}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.lg },
  tabs: { flexDirection: 'row', gap: space.sm },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gap: { gap: space.md },
  cameraFrame: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  reticle: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    right: '18%',
    bottom: '18%',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000AA',
  },
  field: { gap: space.xs },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
})
