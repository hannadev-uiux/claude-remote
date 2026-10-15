import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ConfigContext, ExpoConfig } from 'expo/config'
import {
  type ConfigPlugin,
  type ExportedConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withPlugins,
  withPodfile,
} from 'expo/config-plugins'

const BACKGROUND = '#0D0D0D'
const ORANGE = '#D97757'
/** Same id on both stores. */
const APP_ID = 'tech.doctorx.clauderemote'
/** Android notification channel; the daemon sends `android.notification.channelId` with this id. */
const NOTIFICATION_CHANNEL = 'claude-remote'
/**
 * Push needs a Firebase app per platform (both gitignored); without its file a platform simply
 * builds without Firebase.
 */
const GOOGLE_SERVICES = { ios: './GoogleService-Info.plist', android: './google-services.json' } as const
const firebase = {
  ios: existsSync(GOOGLE_SERVICES.ios),
  android: existsSync(GOOGLE_SERVICES.android),
}

/**
 * iOS system prompts per language (`<lang>.lproj/InfoPlist.strings`). The `infoPlist` values below
 * are the English base; the app texts themselves live in `src/core/i18n/locales`. Android has no
 * equivalent: its permission dialogs use system texts.
 */
const SYSTEM_PROMPTS = {
  en: {
    NSCameraUsageDescription:
      'The camera is used to read the pairing QR code shown by the daemon on your computer.',
    NSLocalNetworkUsageDescription: 'Claude Remote connects to the daemon on your computer.',
  },
  'pt-BR': {
    NSCameraUsageDescription:
      'A câmera é usada para ler o QR code de pareamento exibido pelo daemon no computador.',
    NSLocalNetworkUsageDescription: 'O Claude Remote se conecta ao daemon no seu computador.',
  },
  es: {
    NSCameraUsageDescription:
      'La cámara se usa para leer el código QR de vinculación que muestra el daemon en el ordenador.',
    NSLocalNetworkUsageDescription: 'Claude Remote se conecta al daemon de tu ordenador.',
  },
}
/** Languages the system offers for the app (matching the catalogs pt-BR, en-US and es-ES). */
const APP_LOCALIZATIONS = Object.keys(SYSTEM_PROMPTS)

/**
 * Over-the-air updates (expo-updates): any Expo Updates server (`CLAUDE_REMOTE_UPDATES_URL`) or EAS
 * Update (`EAS_PROJECT_ID`). Without either, updates are off. Manifests are verified against the
 * certificate when it exists; a self-hosted server must have one.
 */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || undefined
const CUSTOM_UPDATES_URL = process.env.CLAUDE_REMOTE_UPDATES_URL || undefined
const UPDATES_URL = CUSTOM_UPDATES_URL ?? (EAS_PROJECT_ID && `https://u.expo.dev/${EAS_PROJECT_ID}`)
const UPDATES_CERTIFICATE = './certs/certificate.pem'
const signedUpdates = existsSync(UPDATES_CERTIFICATE)
if (CUSTOM_UPDATES_URL && !signedUpdates) {
  throw new Error(`CLAUDE_REMOTE_UPDATES_URL needs a code-signing certificate at ${UPDATES_CERTIFICATE}`)
}

/** Camera for the pairing QR, notifications (Android 13+), network for the daemon, haptics. */
const ANDROID_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.INTERNET',
  'android.permission.VIBRATE',
]
/** Added by the template or by libraries but not needed (no audio, files, overlays or scheduled alarms). */
const ANDROID_BLOCKED_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.RECEIVE_BOOT_COMPLETED',
]

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

/**
 * On iPad only, allow landscape alongside portrait (`orientation` above only ever writes the
 * unsuffixed `UISupportedInterfaceOrientations`, never the `~ipad` key — checked in
 * `@expo/config-plugins`'s `ios/Orientation.ts` and `ios/DeviceFamily.ts` — so this plugin can only
 * add a key, never race with it regardless of plugin order).
 */
const withPerIdiomOrientation: ConfigPlugin = (config) =>
  withInfoPlist(config, (plist) => {
    plist.modResults['UISupportedInterfaceOrientations~ipad'] = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ]
    return plist
  })

/**
 * react-native-key-command is a static pod (no `use_frameworks!`), so its ObjC `HardwareShortcuts`
 * class is only visible to `AppDelegate.swift` through the project's Swift bridging header.
 */
const withKeyCommandBridgingHeader: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const name = config.modRequest.projectName
      const headerPath = join(config.modRequest.platformProjectRoot, name ?? '', `${name}-Bridging-Header.h`)
      const contents = readFileSync(headerPath, 'utf8')
      const importLine = '#import "HardwareShortcuts.h"'
      if (!contents.includes(importLine)) writeFileSync(headerPath, `${contents}\n${importLine}\n`)
      return config
    },
  ])

/** `keyCommands`/`handleKeyCommand` are the contract react-native-key-command requires on AppDelegate. */
const withKeyCommandAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (delegate) => {
    let source = delegate.modResults.contents
    const marker = 'HardwareShortcuts.sharedInstance()'
    if (!source.includes(marker)) {
      const methods = [
        '  override var keyCommands: [UIKeyCommand]? {',
        '    return HardwareShortcuts.sharedInstance().keyCommands() as? [UIKeyCommand]',
        '  }',
        '',
        '  @objc func handleKeyCommand(_ keyCommand: UIKeyCommand) {',
        '    HardwareShortcuts.sharedInstance().handleKeyCommand(keyCommand)',
        '  }',
        '}',
        '',
        'class ReactNativeDelegate',
      ].join('\n')
      source = source.replace('}\n\nclass ReactNativeDelegate', methods)
    }
    delegate.modResults.contents = source
    return delegate
  })

/**
 * RNFirebase's plugins fail on a platform without its Google services file, so apply them and then
 * drop the native mods of the platforms that have no file.
 */
const withFirebase: ConfigPlugin = (config) => {
  const skipped = (['ios', 'android'] as const).filter((platform) => !firebase[platform])
  const saved = skipped.map(
    (platform) => [platform, { ...(config as ExportedConfig).mods?.[platform] }] as const,
  )
  const next: ExportedConfig = withPlugins(config, [
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
  ])
  for (const [platform, mods] of saved) next.mods = { ...next.mods, [platform]: mods }
  return firebase.ios ? withFirebaseCocoaPods(next) : next
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expo = withKeyCommandAppDelegate(
    withKeyCommandBridgingHeader(withPerIdiomOrientation(withSceneLifecycle(appConfig(config)))),
  )
  return firebase.ios || firebase.android ? withFirebase(expo) : expo
}

const appConfig = (config: ConfigContext['config']): ExpoConfig => ({
  ...config,
  name: 'Claude Remote',
  slug: 'claude-remote',
  version: '0.4.0',
  scheme: 'claude-remote',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BACKGROUND,
  ios: {
    bundleIdentifier: APP_ID,
    ...(firebase.ios ? { googleServicesFile: GOOGLE_SERVICES.ios } : {}),
    supportsTablet: true,
    infoPlist: {
      // Personal dev build talking ws:// to the computer over Tailscale (WireGuard encrypts the link).
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true, NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription: SYSTEM_PROMPTS.en.NSLocalNetworkUsageDescription,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  // Edge-to-edge is always on in this SDK; screens pad themselves with the safe area insets.
  android: {
    package: APP_ID,
    ...(firebase.android ? { googleServicesFile: GOOGLE_SERVICES.android } : {}),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: BACKGROUND,
    },
    // The composer stays above the keyboard by resizing the window (KeyboardAvoidingView is iOS only).
    softwareKeyboardLayoutMode: 'resize',
    // The pairing token lives in SecureStore, whose keys cannot be restored on another phone.
    allowBackup: false,
    permissions: ANDROID_PERMISSIONS,
    blockedPermissions: ANDROID_BLOCKED_PERMISSIONS,
  },
  locales: SYSTEM_PROMPTS,
  // Updates only reach binaries with the same native code; src/core/updates decides when to check.
  runtimeVersion: { policy: 'fingerprint' },
  updates: UPDATES_URL
    ? {
        url: UPDATES_URL,
        checkAutomatically: 'NEVER',
        fallbackToCacheTimeout: 0,
        ...(signedUpdates
          ? {
              codeSigningCertificate: UPDATES_CERTIFICATE,
              codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
            }
          : {}),
      }
    : { enabled: false },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-secure-store',
    'expo-font',
    ['expo-localization', { supportedLocales: { ios: APP_LOCALIZATIONS, android: APP_LOCALIZATIONS } }],
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
        cameraPermission: SYSTEM_PROMPTS.en.NSCameraUsageDescription,
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        enableBackgroundRemoteNotifications: false,
        icon: './assets/notification-icon.png',
        color: ORANGE,
        defaultChannel: NOTIFICATION_CHANNEL,
      },
    ],
    [
      'expo-build-properties',
      {
        // ws:// to the daemon over Tailscale (WireGuard encrypts the link); Android blocks cleartext by default.
        android: { usesCleartextTraffic: true },
        ...(firebase.ios ? { ios: { useFrameworks: 'static' } } : {}),
      },
    ],
  ],
  extra: { firebase, ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}) },
  experiments: { typedRoutes: true },
})
