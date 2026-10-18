import type { ImageRef } from '@remote-harness/protocol'
import { useRecyclingState } from '@shopify/flash-list'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from '@/ui'
import { ImageViewer } from './ImageViewer'
import { formatBytes } from './image-cache'
import { useTranscriptImage } from './use-transcript-image'

/** Thumbnail box: fixed, so loading never changes the item height and the list does not move. */
const THUMB_HEIGHT = 120
const THUMB_WIDTH = 160

/** Thumbnails of a prompt's or a tool result's images; tapping one opens it full screen. */
export const ImageStrip = memo(function ImageStrip({ images }: { images: readonly ImageRef[] }) {
  // List cells are recycled for other items: the open viewer must not carry over to them.
  const [open, setOpen] = useRecyclingState<number | null>(null, [images])
  if (images.length === 0) return null
  const current = open === null ? undefined : images[open]
  return (
    <View style={styles.strip}>
      {images.map((image, index) => (
        <Thumbnail
          key={image.id}
          image={image}
          index={index}
          count={images.length}
          onOpen={() => setOpen(index, true)}
        />
      ))}
      {current && open !== null ? (
        <ImageViewer image={current} index={open} count={images.length} onClose={() => setOpen(null, true)} />
      ) : null}
    </View>
  )
})

function Thumbnail({
  image,
  index,
  count,
  onOpen,
}: {
  image: ImageRef
  index: number
  count: number
  onOpen: () => void
}) {
  const { t, i18n } = useTranslation()
  const { state, retry } = useTranscriptImage(image)
  const tooLarge = t('images.tooLarge', { size: formatBytes(image.bytes, i18n.language) })
  const label = {
    ready: t('images.open', { index: index + 1, count }),
    loading: t('images.loading'),
    failed: t('images.retry'),
    tooLarge,
  }[state.status]
  const action = state.status === 'ready' ? onOpen : state.status === 'failed' ? retry : undefined
  return (
    <Pressable
      accessibilityRole={state.status === 'failed' ? 'button' : 'imagebutton'}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !action, busy: state.status === 'loading' }}
      disabled={!action}
      onPress={action}
      style={({ pressed }) => [styles.thumb, pressed && styles.pressed]}
    >
      {state.status === 'ready' ? (
        <Image source={{ uri: state.uri }} style={styles.image} resizeMode="contain" />
      ) : state.status === 'loading' ? (
        <ActivityIndicator color={colors.textMuted} accessibilityLabel={t('images.loading')} />
      ) : (
        <Text size="xs" color="textMuted" style={styles.note}>
          {state.status === 'tooLarge' ? tooLarge : t('images.retry')}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.xs },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  pressed: { borderColor: colors.accent },
  image: { width: '100%', height: '100%' },
  note: { padding: space.sm, textAlign: 'center' },
})
