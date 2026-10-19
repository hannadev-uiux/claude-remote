## 1. Protocol and daemon

- [x] 1.1 `LivePendingSchema`; `LiveStatusProps.glyphs`, `pending`, `hint` with defaults
- [x] 1.2 Reducer keeps `pending` (set by tool permissions, cleared on resume / prompt / stop / end) and the last five step glyphs; `liveProps` fills glyphs, pending labels and the done / closed hint; pending changes send at once; Android body with glyphs; i18n `live.allow / deny / total / closedHint`; tests

## 2. App

- [x] 2.1 `SessionActivity` redesigned (mark, large tabular timer, state line, glyph row, indeterminate bar, Deny / Allow buttons with targets, done / closed hints, Dynamic Island compact / minimal / expanded); `localLiveProps` with the new fields
- [x] 2.2 `liveAction(target)` (pure, tested) and the user-interaction listener answering through `respondInBackground`

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
