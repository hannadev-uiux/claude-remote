## ADDED Requirements

### Requirement: Edge swipe for the tablet sidebar
In the two-column class in portrait (overlay sidebar), a rightward swipe starting at the left edge of the window, below the header, SHALL open the session list. The list follows the finger and, on release, stays open past half its width or after a quick rightward flick; otherwise it slides back. With the list open, a leftward swipe on the dimmed area SHALL close it, following the finger, and a tap there SHALL still close it. Opening and closing SHALL slide, instantly when the system's reduced motion is on.

The edge swipe SHALL only exist on the list and on a session's conversation, where ☰ replaces the back button; there, the stack's back swipe MUST be off in this layout. Deeper screens (terminal, subagent, settings) MUST keep their back swipe and get no edge swipe, and phones MUST NOT get it at all. Swipes on the list's rows MUST keep their swipe actions.

#### Scenario: Open with the edge swipe
- **WHEN** an iPad in portrait shows a session's conversation and the user drags from the left edge 250 points to the right and lifts the finger
- **THEN** the list stays open over the dimmed conversation

#### Scenario: Short drag
- **WHEN** the user drags from the left edge 100 points slowly and lifts the finger
- **THEN** the list slides back and stays closed

#### Scenario: Close with a swipe
- **WHEN** the list is open and the user swipes left on the dimmed conversation
- **THEN** the list follows the finger and closes

#### Scenario: Phone back gesture
- **WHEN** the app runs on a phone and the user swipes from the left edge on a session
- **THEN** the stack goes back as before

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the user taps ☰
- **THEN** the list appears without the slide animation
