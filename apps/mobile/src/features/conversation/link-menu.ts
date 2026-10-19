import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, ActionSheetIOS, Linking, Platform, Share, ToastAndroid } from 'react-native'
import { create } from 'zustand'
import type { TFunction } from '@/core/i18n'
import { useTheme } from '@/core/theme'
import { classifyLink, type LinkAction, type LinkTarget, linkActions } from './links'

/** Link whose menu is open on Android (iOS uses the native action sheet). */
export const useLinkSheetStore = create<{ target: LinkTarget | null }>(() => ({ target: null }))

export const closeLinkSheet = () => useLinkSheetStore.setState({ target: null })

export function runLinkAction(action: LinkAction, target: LinkTarget, t: TFunction): void {
  if (action === 'open') {
    void Linking.openURL(target.value).catch(() => undefined)
  } else if (action === 'share') {
    const content =
      Platform.OS === 'ios' && target.kind === 'web' ? { url: target.value } : { message: target.value }
    void Share.share(content).catch(() => undefined)
  } else {
    void copyLink(target.value, t)
  }
}

async function copyLink(value: string, t: TFunction): Promise<void> {
  const ok = await Clipboard.setStringAsync(value).catch(() => false)
  if (!ok) return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  const copied = t('conversation.link.copied')
  if (Platform.OS === 'android') ToastAndroid.show(copied, ToastAndroid.SHORT)
  AccessibilityInfo.announceForAccessibility(copied)
}

/** Tap and long-press handlers for a link: tap opens web links, anything else shows the menu. */
export function useLinkHandlers(href: string) {
  const { t } = useTranslation()
  const theme = useTheme()

  const showMenu = () => {
    const target = classifyLink(href)
    if (Platform.OS !== 'ios') {
      useLinkSheetStore.setState({ target })
      return
    }
    void Haptics.selectionAsync()
    const actions = linkActions(target.kind)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: target.value,
        options: [...actions.map((action) => t(`conversation.link.${action}`)), t('common.cancel')],
        cancelButtonIndex: actions.length,
        userInterfaceStyle: theme.scheme,
        tintColor: theme.colors.accentText,
      },
      (index) => {
        const action = actions[index]
        if (action) runLinkAction(action, target, t)
      },
    )
  }

  const onPress = () => {
    const target = classifyLink(href)
    if (target.kind === 'web') runLinkAction('open', target, t)
    else showMenu()
  }

  return { onPress, onLongPress: showMenu }
}
