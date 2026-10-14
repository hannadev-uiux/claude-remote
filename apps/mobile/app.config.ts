import { existsSync } from 'node:fs'
import type { ConfigContext, ExpoConfig } from 'expo/config'

const BACKGROUND = '#0D0D0D'
/** Push needs a Firebase iOS app; without the plist the build simply skips Firebase. */
const GOOGLE_SERVICES = './GoogleService-Info.plist'
const firebaseEnabled = existsSync(GOOGLE_SERVICES)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Claude Remote',
  slug: 'claude-remote',
  version: '0.1.0',
  scheme: 'claude-remote',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BACKGROUND,
  ios: {
    bundleIdentifier: 'tech.doctorx.clauderemote',
    ...(firebaseEnabled ? { googleServicesFile: GOOGLE_SERVICES } : {}),
    supportsTablet: false,
    infoPlist: {
      // Personal dev build talking ws:// to the Mac over Tailscale (WireGuard encrypts the link).
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true, NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription: 'O Claude Remote se conecta ao daemon no seu Mac.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: BACKGROUND,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'A câmera é usada para ler o QR code de pareamento exibido pelo daemon no Mac.',
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    ['expo-notifications', { enableBackgroundRemoteNotifications: false }],
    ...(firebaseEnabled
      ? [
          '@react-native-firebase/app',
          '@react-native-firebase/messaging',
          ['expo-build-properties', { ios: { useFrameworks: 'static' } }] as [string, unknown],
        ]
      : []),
  ],
  extra: { firebaseEnabled },
  experiments: { typedRoutes: true },
})
