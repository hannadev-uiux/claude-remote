## ADDED Requirements

### Requirement: Composer above the keyboard
On iOS, the conversation SHALL keep the whole composer, its keyboard toolbar included, right above the on-screen keyboard. The suggestions bar and later changes in the keyboard's height count as part of the keyboard. The keyboard offset SHALL be the measured position where the conversation starts in the window, not a fixed guess.

#### Scenario: Suggestions bar on a phone with the Dynamic Island
- **WHEN** the message input is focused on an iPhone whose header is taller than 90 points and the QuickType suggestions bar is shown
- **THEN** the keyboard toolbar is fully visible above the suggestions bar

### Requirement: Autocorrect in the message input
The message input SHALL autocorrect and spell check by default, without automatic capitalization. Corrections MUST be off while the message starts with `/` and while an `@` or `/` autocomplete trigger is under the cursor. The setting "Autocorrect in the message input" (Settings → Keyboard, on by default, per device) SHALL turn corrections off entirely. All texts MUST be translated.

#### Scenario: Accents
- **WHEN** the user types "voce nao" in the message input with a Portuguese keyboard
- **THEN** the keyboard offers or applies "você não"

#### Scenario: Command
- **WHEN** the message is `/compact`
- **THEN** the keyboard does not correct it

#### Scenario: Setting off
- **WHEN** "Autocorrect in the message input" is off
- **THEN** the message input never corrects
