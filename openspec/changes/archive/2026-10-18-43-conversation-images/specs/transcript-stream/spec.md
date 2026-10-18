## ADDED Requirements

### Requirement: Transcript images
The parser SHALL turn base64 image blocks of user messages and of tool result contents into image refs on the entry instead of placeholder text: a prompt's images attach to the prompt text entry of the same line; without prompt text they attach to the line's last tool result when there is one, or else to a `user` entry with empty text; a tool result's own images attach to that result. Each ref id SHALL identify the transcript line and the image's position in it. The daemon SHALL answer `transcript.image` by reading that line again and returning the image, for controllable and read-only sessions and for subagents; a malformed id or a missing image MUST be answered with `not_found`, an image over the limit with `too_large`. Serving history pages and images MUST NOT consume transcript lines that a live stream has not sent to its subscribers yet.

#### Scenario: Prompt with a screenshot
- **WHEN** a user line has a text block "what is wrong here?" and a PNG image block
- **THEN** one `user` entry has that text and one image ref with `mediaType` "image/png"

#### Scenario: Tool result with an image
- **WHEN** a `tool_result` block contains an image block and a text block
- **THEN** the `tool_result` entry has the text as `content` and one image ref, and no `[imagem]` text appears

#### Scenario: Fetch an image
- **WHEN** the app sends `transcript.image` with the id of that ref
- **THEN** the daemon answers with the PNG's media type and base64 data

#### Scenario: Unknown image
- **WHEN** the app sends `transcript.image` with an id whose line has no such image
- **THEN** the daemon answers `not_found`
