## ADDED Requirements

### Requirement: Images in the conversation
The conversation SHALL show the images of user prompts and tool results as thumbnails of fixed size, below the prompt text and in the tool call (collapsed and in the Output tab). Image data MUST be fetched only when a thumbnail is about to be shown, with at most two fetches at a time, the newest first, fetches dropped when their thumbnail goes away before they start, and a size-capped cache, and a placeholder MUST keep the thumbnail's size while loading so the list does not move. Tapping a thumbnail SHALL open a full-screen viewer with pinch zoom, pan and double tap, closed with a close button, a single tap while not zoomed or the Android back button. An image that fails to load SHALL show a localized message and retry when tapped; while the daemon is disconnected it SHALL wait and load once the connection is back. An image over the size limit SHALL show a localized message with its size. All texts and accessibility labels MUST be translated.

#### Scenario: Screenshot in a tool result
- **WHEN** a tool result with an image is shown in the conversation
- **THEN** its thumbnail appears in the tool call and loads when it scrolls into view

#### Scenario: Full screen
- **WHEN** the user taps a thumbnail
- **THEN** the image opens full screen and can be zoomed with a pinch

#### Scenario: Too large
- **WHEN** an image ref is larger than the limit
- **THEN** the thumbnail shows that the image is too large to preview, without fetching it

#### Scenario: Android back
- **WHEN** the viewer is open on Android and the user presses back
- **THEN** the viewer closes and the conversation stays open
