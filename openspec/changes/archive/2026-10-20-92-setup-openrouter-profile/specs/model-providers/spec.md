## ADDED Requirements

### Requirement: Provider key check
The daemon SHALL be able to check a provider key against the gateway: `GET <baseUrl>/v1/credits` with the key (200 → valid with the credits; 401 → invalid), otherwise `GET <baseUrl>/v1/key` (200 → valid without credits; 401 → invalid), otherwise unknown with the reason. The key MUST only be sent to the gateway, in the `Authorization` header.

#### Scenario: Management key
- **WHEN** `/v1/credits` answers 200 with 50 credits bought and 7.9 used
- **THEN** the check is valid with credits `{ total: 50, used: 7.9 }`

#### Scenario: Regular key
- **WHEN** `/v1/credits` answers 403 and `/v1/key` answers 200
- **THEN** the check is valid without credits

#### Scenario: Gateway down
- **WHEN** both calls fail with a network error
- **THEN** the check is unknown with the error's message

### Requirement: Provider key removal
A stored provider key SHALL be removable from the secret store (Keychain, Secret Service or the `0600` file); removing a key that is not stored MUST NOT fail.

#### Scenario: Remove a stored key
- **WHEN** the key of `openrouter` is stored in the file store and is removed
- **THEN** reading it afterwards returns nothing
