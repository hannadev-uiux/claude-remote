## Why

The special-keys bar (`KeyBar`) is always shown under the conversation and takes vertical space on a phone even when it is not needed, and the header spends its only free slot on the terminal icon (issue #37). There is also no quick way to find an earlier prompt in a long conversation.

## What Changes

- The terminal icon in the session header is replaced by a **More options** button (`EllipsisVertical`) that opens a menu with:
  - **View terminal** (what the icon did);
  - **Show/Hide keyboard shortcuts**, which toggles the `KeyBar`. The choice is remembered per device and the bar is hidden by default;
  - **Conversation history**.
- **Conversation history** opens a sheet that lists the session's prompts, newest first, from the loaded transcript. "Load earlier" fetches older pages (`session.history`) until the start of the transcript. Tapping a prompt closes the sheet and scrolls the conversation to it.
- The menu is native on iOS (action sheet) and a Material-style anchored menu on Android. In a read-only session, View terminal and the shortcuts toggle are disabled and the menu explains why; history stays available.
- Texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: controls (key bar visibility), session options menu and prompt history.

## Impact

`apps/mobile`: session route header, `ConversationScreen`, a new `ActionMenu` UI component, a persisted `key-bar` preference (SecureStore, like the voice language), a pure `promptHistory` selector and `menuItems` builder with Vitest tests, i18n catalogs. No protocol or daemon change; works over an OTA update (no native dependency).
