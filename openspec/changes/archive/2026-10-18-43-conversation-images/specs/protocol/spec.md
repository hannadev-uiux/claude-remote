## ADDED Requirements

### Requirement: Transcript image messages
`user` and `tool_result` transcript entries SHALL carry `images`, a list of image refs with `id`, `mediaType` and `bytes`, defaulting to an empty list when absent. The client SHALL be able to send `transcript.image` with `sessionId`, an optional `agentId` and `imageId`, answered with `transcript.image` carrying `imageId`, `mediaType` and base64 `data`. Images larger than `MAX_TRANSCRIPT_IMAGE_BYTES` (5 MB) MUST be answered with `too_large`.

#### Scenario: Entry without images
- **WHEN** a `transcript.entry` with a `user` entry and no `images` field is validated
- **THEN** it is valid and `images` is an empty list

#### Scenario: Image request
- **WHEN** the client sends `transcript.image` with `sessionId` "s1" and `imageId` "12.0"
- **THEN** the message is valid and the daemon answers `transcript.image` with the image's media type and data
