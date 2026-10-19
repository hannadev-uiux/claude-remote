import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
  withXcodeProject,
} from 'expo/config-plugins'

/** Dark theme background (splash and adaptive icon backdrop; the artwork changes in #84). */
const BACKGROUND = '#0D0D0D'
/** Product accent (amber), same as `accent` in `src/core/theme/palettes.ts`. */
const ACCENT = '#E8A33D'
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
      'The camera is used to read the pairing QR code shown by Remote Harness on your computer and to take photos for the prompt.',
    NSPhotoLibraryUsageDescription:
      'Photos you pick are sent with the prompt to the coding agent on your computer.',
    NSLocalNetworkUsageDescription: 'Remote Harness connects to your computer over your private network.',
    NSMicrophoneUsageDescription: 'The microphone is used to record voice messages for the prompt.',
    NSSpeechRecognitionUsageDescription:
      'Speech recognition turns your voice messages into text, on this device.',
  },
  'pt-BR': {
    NSCameraUsageDescription:
      'A câmera é usada para ler o QR code de pareamento exibido pelo Remote Harness no computador e para tirar fotos para o prompt.',
    NSPhotoLibraryUsageDescription:
      'As fotos escolhidas são enviadas com o prompt ao agente de código no seu computador.',
    NSLocalNetworkUsageDescription: 'O Remote Harness se conecta ao seu computador pela sua rede privada.',
    NSMicrophoneUsageDescription: 'O microfone é usado para gravar mensagens de voz do prompt.',
    NSSpeechRecognitionUsageDescription:
      'O reconhecimento de voz transforma suas mensagens de voz em texto, neste aparelho.',
  },
  es: {
    NSCameraUsageDescription:
      'La cámara se usa para leer el código QR de vinculación que muestra Remote Harness en el ordenador y para hacer fotos para el mensaje.',
    NSPhotoLibraryUsageDescription:
      'Las fotos que elijas se envían con el mensaje al agente de código en tu ordenador.',
    NSLocalNetworkUsageDescription: 'Remote Harness se conecta a tu ordenador por tu red privada.',
    NSMicrophoneUsageDescription: 'El micrófono se usa para grabar mensajes de voz del mensaje.',
    NSSpeechRecognitionUsageDescription:
      'El reconocimiento de voz convierte tus mensajes de voz en texto, en este dispositivo.',
  },
}
/** Languages the system offers for the app (matching the catalogs pt-BR, en-US and es-ES). */
const APP_LOCALIZATIONS = Object.keys(SYSTEM_PROMPTS)

/**
 * Over-the-air updates (expo-updates): any Expo Updates server (`REMOTE_HARNESS_UPDATES_URL`,
 * or `CLAUDE_REMOTE_UPDATES_URL` from before the rename) or EAS
 * Update (`EAS_PROJECT_ID`). Without either, updates are off. Manifests are verified against the
 * certificate when it exists; a self-hosted server must have one.
 */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || undefined
const CUSTOM_UPDATES_URL =
  process.env.REMOTE_HARNESS_UPDATES_URL || process.env.CLAUDE_REMOTE_UPDATES_URL || undefined
const UPDATES_URL = CUSTOM_UPDATES_URL ?? (EAS_PROJECT_ID && `https://u.expo.dev/${EAS_PROJECT_ID}`)
const UPDATES_CERTIFICATE = './certs/certificate.pem'
/** Push relay (Cloud Function) for daemons without a Firebase service account; absent = no relay. */
const PUSH_RELAY_URL =
  process.env.REMOTE_HARNESS_PUSH_RELAY_URL || process.env.CLAUDE_REMOTE_PUSH_RELAY_URL || undefined
const signedUpdates = existsSync(UPDATES_CERTIFICATE)
if (CUSTOM_UPDATES_URL && !signedUpdates) {
  throw new Error(`REMOTE_HARNESS_UPDATES_URL needs a code-signing certificate at ${UPDATES_CERTIFICATE}`)
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

/** Target `expo-widgets` creates (and recreates on every prebuild) for the Live Activity. */
const WIDGET_TARGET = 'ExpoWidgetsTarget'
/** Asset the Live Activity layout loads with `Image assetName` (see `SessionActivity.tsx`). */
const LIVE_ACTIVITY_ICON_ASSET = 'LiveActivityIcon'
const LIVE_ACTIVITY_ICON = './assets/live-activity-icon.png'

/**
 * The widget extension is its own bundle, without the app's asset catalog: give it one holding the
 * app icon for the Live Activity header. Applied before the `plugins` list, so its mods run after
 * the `expo-widgets` ones that recreate the target directory and add the target.
 */
const withLiveActivityIcon: ConfigPlugin = (config) => {
  const withCatalog = withDangerousMod(config, [
    'ios',
    (config) => {
      const catalog = join(config.modRequest.platformProjectRoot, WIDGET_TARGET, 'Assets.xcassets')
      const imageSet = join(catalog, `${LIVE_ACTIVITY_ICON_ASSET}.imageset`)
      const info = { author: 'xcode', version: 1 }
      mkdirSync(imageSet, { recursive: true })
      writeFileSync(join(catalog, 'Contents.json'), JSON.stringify({ info }, null, 2))
      copyFileSync(join(config.modRequest.projectRoot, LIVE_ACTIVITY_ICON), join(imageSet, 'icon.png'))
      writeFileSync(
        join(imageSet, 'Contents.json'),
        JSON.stringify({ images: [{ filename: 'icon.png', idiom: 'universal' }], info }, null, 2),
      )
      return config
    },
  ])
  return withXcodeProject(withCatalog, (config) => {
    const project = config.modResults
    const target = project.findTargetKey(WIDGET_TARGET)
    const group = project.findPBXGroupKey({ name: WIDGET_TARGET })
    if (!target || !group)
      throw new Error(`withLiveActivityIcon: ${WIDGET_TARGET} not found; check expo-widgets`)
    // `addResourceFile` needs a "Resources" group the project does not have: wire the file by hand.
    const file = project.addFile('Assets.xcassets', group, { lastKnownFileType: 'folder.assetcatalog' })
    if (!file) return config
    file.uuid = project.generateUuid()
    file.target = target
    project.addToPbxBuildFileSection(file)
    // Without a Resources phase of its own, `pbxResourcesBuildPhaseObj` falls back to the app's.
    const phases: { comment?: string }[] = project.pbxNativeTargetSection()[target]?.buildPhases ?? []
    if (!phases.some((phase) => phase.comment === 'Resources')) {
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target)
    }
    project.addToPbxResourcesBuildPhase(file)
    return config
  })
}

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
    '@react-native-firebase/app-check',
  ])
  for (const [platform, mods] of saved) next.mods = { ...next.mods, [platform]: mods }
  return firebase.ios ? withFirebaseCocoaPods(next) : next
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expo = withLiveActivityIcon(
    withKeyCommandAppDelegate(
      withKeyCommandBridgingHeader(withPerIdiomOrientation(withSceneLifecycle(appConfig(config)))),
    ),
  )
  return firebase.ios || firebase.android ? withFirebase(expo) : expo
}

const appConfig = (config: ConfigContext['config']): ExpoConfig => ({
  ...config,
  name: 'Remote Harness',
  slug: 'claude-remote',
  version: '0.12.0',
  scheme: 'claude-remote',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // System surfaces (alerts, pickers) follow the phone; the app theme comes from `src/core/theme`.
  userInterfaceStyle: 'automatic',
  backgroundColor: BACKGROUND,
  ios: {
    bundleIdentifier: APP_ID,
    // With certificates of several teams on the Mac, Expo would pick one on its own: pin it with
    // APPLE_TEAM_ID (e.g. in .env.local).
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
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
        // Builds follow production; Settings can switch to development at runtime.
        requestHeaders: { 'expo-channel-name': 'production' },
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
        // Same text passed to expo-speech-recognition below: whichever plugin runs last must not
        // matter, since `false` here would otherwise delete the key the other plugin just set.
        microphonePermission: SYSTEM_PROMPTS.en.NSMicrophoneUsageDescription,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        // Same texts as expo-camera above, for the same reason (plugin order must not matter).
        photosPermission: SYSTEM_PROMPTS.en.NSPhotoLibraryUsageDescription,
        cameraPermission: SYSTEM_PROMPTS.en.NSCameraUsageDescription,
        microphonePermission: SYSTEM_PROMPTS.en.NSMicrophoneUsageDescription,
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: SYSTEM_PROMPTS.en.NSMicrophoneUsageDescription,
        speechRecognitionPermission: SYSTEM_PROMPTS.en.NSSpeechRecognitionUsageDescription,
      },
    ],
    [
      'expo-notifications',
      {
        enableBackgroundRemoteNotifications: false,
        icon: './assets/notification-icon.png',
        color: ACCENT,
        defaultChannel: NOTIFICATION_CHANNEL,
      },
    ],
    // Live Activity of running sessions: widget extension, App Group and remote (FCM) updates.
    ['expo-widgets', { enablePushNotifications: true, frequentUpdates: true }],
    [
      'expo-build-properties',
      {
        // ws:// to the daemon over Tailscale (WireGuard encrypts the link); Android blocks cleartext by default.
        android: { usesCleartextTraffic: true },
        ios: {
          // The precompiled Expo modules are built with one Swift version and fail to import with a
          // newer Xcode ("this SDK is not supported by the compiler"); build them with the local one.
          usePrecompiledModules: false,
          // UIKit scene lifecycle, required by the iOS 27 SDK (Xcode 27).
          enableSceneSupport: true,
          ...(firebase.ios ? { useFrameworks: 'static' as const } : {}),
        },
      },
    ],
  ],
  extra: {
    firebase,
    ...(PUSH_RELAY_URL ? { pushRelay: PUSH_RELAY_URL } : {}),
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
  experiments: { typedRoutes: true },
})
