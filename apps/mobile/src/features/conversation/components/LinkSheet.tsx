import { useTranslation } from 'react-i18next'
import { Modal, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { closeLinkSheet, runLinkAction, useLinkSheetStore } from '../link-menu'
import { linkActions } from '../links'

/** Long-press menu of a link on Android: the target and Open / Copy link / Share. */
export function LinkSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const target = useLinkSheetStore((s) => s.target)

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={closeLinkSheet}>
      <Pressable style={styles.backdrop} onPress={closeLinkSheet}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text size="sm" color="info" numberOfLines={3} selectable>
            {target?.value}
          </Text>
          {target
            ? linkActions(target.kind).map((action) => (
                <Pressable
                  key={action}
                  accessibilityRole="button"
                  onPress={() => {
                    closeLinkSheet()
                    runLinkAction(action, target, t)
                  }}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                  <Text>{t(`conversation.link.${action}`)}</Text>
                </Pressable>
              ))
            : null}
          <Button label={t('common.cancel')} variant="ghost" onPress={closeLinkSheet} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  action: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  pressed: { borderColor: theme.colors.accent },
}))
