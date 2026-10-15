/** react-native-key-command ships no types. Shape verified against the package's `ios/KeyCommand.h`/`KeyCommand.mm`. */
declare module 'react-native-key-command' {
  export const constants: {
    keyModifierCapsLock: number
    keyModifierShift: number
    keyModifierControl: number
    keyModifierOption: number
    keyModifierCommand: number
    keyModifierControlOption: number
    keyModifierControlOptionCommand: number
    keyModifierControlCommand: number
    keyModifierOptionCommand: number
    keyModifierShiftCommand: number
    keyModifierNumericPad: number
    keyInputUpArrow: string
    keyInputDownArrow: string
    keyInputLeftArrow: string
    keyInputRightArrow: string
    keyInputEscape: string
    keyInputEnter: string
  }

  export type KeyCommandInput = { input: string; modifierFlags?: number }
  export type KeyCommandEvent = { input: string; modifierFlags: number }

  /** Registers the shortcut and listens for it; returns the unsubscribe function. */
  export function addListener(
    keyCommand: KeyCommandInput,
    callback: (event: KeyCommandEvent) => void,
  ): () => void
  export function registerKeyCommands(keyCommands: KeyCommandInput[]): Promise<void>
  export function unregisterKeyCommands(keyCommands: KeyCommandInput[]): Promise<void>
}
