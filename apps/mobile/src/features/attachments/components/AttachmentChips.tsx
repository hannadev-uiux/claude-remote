import { X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import type { PreparedImage } from '../limits'

type Props = { images: PreparedImage[]; onRemove: (key: string) => void; disabled?: boolean }

/** Thumbnails of the photos waiting to be sent with the prompt. */
export function AttachmentChips({ images, onRemove, disabled }: Props) {
  const { t } = useTranslation()
  if (images.length === 0) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {images.map((image, index) => (
        <View key={image.key} style={styles.chip}>
          <Image
            source={{ uri: image.uri }}
            style={styles.thumb}
            accessibilityLabel={t('attachments.photo', { index: index + 1 })}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('attachments.remove', { index: index + 1 })}
            hitSlop={10}
            disabled={disabled}
            onPress={() => onRemove(image.key)}
            style={styles.remove}
          >
            <X size={12} color={colors.text} strokeWidth={3} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

const THUMB = 56

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm },
  chip: { width: THUMB, height: THUMB },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
