import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ToastAndroid } from 'react-native'

const COPIED_MS = 1500

/**
 * Copies to the clipboard and confirms without blocking: haptic, accessibility announcement and,
 * with `toast` (copies that have no icon to swap), a toast on Android. Local only.
 */
export async function copyText(value: string, copied: string, { toast = false } = {}): Promise<boolean> {
  const ok = await Clipboard.setStringAsync(value).catch(() => false)
  if (!ok) return false
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  if (toast && Platform.OS === 'android') ToastAndroid.show(copied, ToastAndroid.SHORT)
  AccessibilityInfo.announceForAccessibility(copied)
  return true
}

/** "Just copied" flag for swapping a copy icon for a check. */
export function useCopied() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flash = () => {
    clearTimeout(timer.current)
    setCopied(true)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }
  return { copied, flash }
}
