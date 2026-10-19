## MODIFIED Requirements

### Requirement: Automatic reconnection
When the connection is lost, the app SHALL try to reconnect with exponential backoff (1 s up to 30 s), reconnect immediately when returning to the foreground, and resubscribe to open sessions with the last cursor received. A connection attempt that has not opened after 10 s SHALL be abandoned and counted as unreachable; while reconnecting after an unreachable attempt, the indicator MUST say the computer may be asleep or offline.

#### Scenario: Network change
- **WHEN** the phone switches from Wi-Fi to 4G
- **THEN** the app reconnects and the conversation continues from where it left off, without duplicate messages

#### Scenario: Connection indicator
- **WHEN** the connection drops
- **THEN** the app shows the "reconnecting" state at the top

#### Scenario: Computer asleep
- **WHEN** the computer went to sleep and connection attempts get no answer
- **THEN** the indicator says the computer is not answering and may be asleep or offline, and the app reconnects by itself once it wakes
