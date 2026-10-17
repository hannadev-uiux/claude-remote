import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fitWithin, JPEG_QUALITY, type PreparedImage } from './limits'

export type ImageSource = 'camera' | 'library'

let keySeq = 0

/** Resizes to the upload size and re-encodes as JPEG, so every attachment is small and one format. */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  let context = ImageManipulator.manipulate(asset.uri)
  let target = fitWithin(asset.width, asset.height)
  if (!target && (asset.width <= 0 || asset.height <= 0)) {
    // Some pickers report no size: render once to learn it.
    const probe = await context.renderAsync()
    target = fitWithin(probe.width, probe.height)
    context = ImageManipulator.manipulate(probe)
  }
  if (target) context.resize(target)
  const image = await context.renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true })
  if (!saved.base64) throw new Error('no image data')
  return {
    key: `img-${++keySeq}`,
    uri: saved.uri,
    base64: saved.base64,
    mimeType: 'image/jpeg',
    width: saved.width,
    height: saved.height,
  }
}

/** Takes or picks photos and prepares them for upload. Resolves to [] when the user cancels. */
export function useImagePicker() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const pick = useCallback(
    async (source: ImageSource, limit: number): Promise<PreparedImage[]> => {
      if (limit <= 0) return []
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) throw new Error(t('attachments.errors.cameraDenied'))
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images' })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              allowsMultipleSelection: limit > 1,
              selectionLimit: limit,
            })
      if (result.canceled) return []
      setBusy(true)
      try {
        return await Promise.all(result.assets.slice(0, limit).map(prepare))
      } catch {
        throw new Error(t('attachments.errors.loadFailed'))
      } finally {
        setBusy(false)
      }
    },
    [t],
  )

  return { pick, busy }
}
