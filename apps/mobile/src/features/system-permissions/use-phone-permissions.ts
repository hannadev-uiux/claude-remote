import * as ImagePicker from 'expo-image-picker'
import * as Notifications from 'expo-notifications'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { useIsConnected } from '@/core/connection'
import {
  localNetworkStatus,
  mapExpoPermission,
  mapPhotoLibraryPermission,
  type PermissionStatus,
} from './status.ts'

export type PhonePermissionId = 'notifications' | 'camera' | 'photos' | 'microphone' | 'localNetwork'
export type PhoneRow = { id: PhonePermissionId; status: PermissionStatus }

async function queryRows(connected: boolean): Promise<PhoneRow[]> {
  const [notifications, camera, photos, microphone] = await Promise.all([
    Notifications.getPermissionsAsync(),
    ImagePicker.getCameraPermissionsAsync(),
    ImagePicker.getMediaLibraryPermissionsAsync(),
    ExpoSpeechRecognitionModule.getPermissionsAsync(),
  ])
  const rows: PhoneRow[] = [
    { id: 'notifications', status: mapExpoPermission(notifications) },
    { id: 'camera', status: mapExpoPermission(camera) },
    { id: 'photos', status: mapPhotoLibraryPermission(photos) },
    { id: 'microphone', status: mapExpoPermission(microphone) },
  ]
  const localNetwork = localNetworkStatus(Platform.OS === 'ios' ? 'ios' : 'android', connected)
  if (localNetwork) rows.push({ id: 'localNetwork', status: localNetwork })
  return rows
}

async function request(id: PhonePermissionId): Promise<void> {
  if (id === 'notifications') await Notifications.requestPermissionsAsync()
  else if (id === 'camera') await ImagePicker.requestCameraPermissionsAsync()
  else if (id === 'photos') await ImagePicker.requestMediaLibraryPermissionsAsync()
  else if (id === 'microphone') await ExpoSpeechRecognitionModule.requestPermissionsAsync()
}

/** The "On this phone" rows: queried from the SDKs already used elsewhere in this app, never prompting on its own. */
export function usePhonePermissions() {
  const connected = useIsConnected()
  const [rows, setRows] = useState<PhoneRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setRows(await queryRows(connected))
    setLoading(false)
  }, [connected])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const allow = useCallback(
    async (id: PhonePermissionId) => {
      await request(id)
      await refresh()
    },
    [refresh],
  )

  return { rows, loading, refresh, allow }
}
