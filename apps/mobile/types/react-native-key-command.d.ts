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

  /** `priority` comes from patches/react-native-key-command (iOS `wantsPriorityOverSystemBehavior`). */
  export type KeyCommandInput = { input: string; modifierFlags?: number; priority?: boolean }
  export type KeyCommandEvent = { input: string; modifierFlags: number }

  /** Registers the shortcut and listens for it; returns the unsubscribe function. */
  export function addListener(
    keyCommand: KeyCommandInput,
    callback: (event: KeyCommandEvent) => void,
  ): () => void
  /** Emits every registered shortcut as `onKeyCommand`; `addListener` filters it per shortcut. */
  export const eventEmitter: {
    addListener(event: 'onKeyCommand', listener: (event: KeyCommandEvent) => void): { remove(): void }
  }
  export function registerKeyCommands(keyCommands: KeyCommandInput[]): Promise<void>
  export function unregisterKeyCommands(keyCommands: KeyCommandInput[]): Promise<void>
}
