import { existsSync } from 'node:fs'
import type { ConfigContext, ExpoConfig } from 'expo/config'
import { type ConfigPlugin, withAppDelegate, withInfoPlist, withPodfile } from 'expo/config-plugins'

const BACKGROUND = '#0D0D0D'
/** Push needs a Firebase iOS app; without the plist the build simply skips Firebase. */
const GOOGLE_SERVICES = './GoogleService-Info.plist'
const firebaseEnabled = existsSync(GOOGLE_SERVICES)

/** RNFirebase refuses SPM + static frameworks; resolve the Firebase SDK through CocoaPods instead. */
const withFirebaseCocoaPods: ConfigPlugin = (config) =>
  withPodfile(config, (podfile) => {
    const flag = '$RNFirebaseDisableSPM = true'
    if (!podfile.modResults.contents.includes(flag)) {
      podfile.modResults.contents = `${flag}\n${podfile.modResults.contents}`
    }
    return podfile
  })

/**
 * iOS 27 asserts at launch unless the app adopts the UIScene life cycle, and the SDK 57 template
 * still starts React Native from the app delegate. Hand the window over to Expo's
 * `ExpoAppSceneDelegate` (registered in Objective-C as `EXExpoAppSceneDelegate`).
 */
const withSceneLifecycle: ConfigPlugin = (config) => {
  const withScenes = withInfoPlist(config, (plist) => {
    plist.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    }
    return plist
  })
  return withAppDelegate(withScenes, (delegate) => {
    let source = delegate.modResults.contents
    source = source.replace(
      /class AppDelegate: ExpoAppDelegate \{/,
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    )
    // The scene delegate creates the window and starts React Native.
    source = source.replace(/\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow[\s\S]*?#endif\n/, '\n')
    if (!source.includes('ExpoReactNativeFactoryProvider') || source.includes('startReactNative(')) {
      throw new Error('withSceneLifecycle: AppDelegate.swift template changed; update the plugin')
    }
    delegate.modResults.contents = source
    return delegate
  })
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expo = withSceneLifecycle(appConfig(config))
  return firebaseEnabled ? withFirebaseCocoaPods(expo) : expo
}

const appConfig = (config: ConfigContext['config']): ExpoConfig => ({
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
