import Constants from 'expo-constants'

type MessagingModule = typeof import('@react-native-firebase/messaging')

/** Loads RN Firebase only when the build was configured with GoogleService-Info.plist. */
export function loadMessaging(): MessagingModule | null {
  if (!Constants.expoConfig?.extra?.firebaseEnabled) return null
  try {
    return require('@react-native-firebase/messaging') as MessagingModule
  } catch {
    return null
  }
}
