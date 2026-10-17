import type { DevicePlatform } from '@remote-harness/protocol'

/** Platform reported to the daemon in `device.register` (undefined on web, which has no push). */
export function devicePlatform(os: string): DevicePlatform | undefined {
  return os === 'ios' || os === 'android' ? os : undefined
}

/**
 * KeyboardAvoidingView behavior: iOS pads the content; Android resizes the window itself
 * (`softwareKeyboardLayoutMode: 'resize'`), so the view must not add its own offset.
 */
export function keyboardBehavior(os: string): 'padding' | undefined {
  return os === 'ios' ? 'padding' : undefined
}
