## 1. Store texts and assets

- [x] 1.1 `apps/mobile/store/metadata.ts` (pt-BR, en-US, es-ES), `scripts/store-metadata.mts` writing the fastlane tree, `store:metadata` script, generated tree ignored
- [x] 1.2 `scripts/store-metadata.test.ts`: parity, length limits, URLs served by the site
- [x] 1.3 `icons.mts`: feature graphic 1024 × 500 rendered to `apps/mobile/store/feature-graphic.png` (and the path-data formatter that fixes the `NaN` opentype's rounding produced in the banner)

## 2. Site

- [x] 2.1 Privacy policy docs page in the three languages (`privacy` slug after security), footer link on the landing, catalogs
- [x] 2.2 Migration note for development-build users in troubleshooting (three languages)

## 3. Issue

- [x] 3.1 Owner checklist on #161 (enrollment, App ID, APNs key, App Store Connect, TestFlight, review notes, labels, Play Console, Play Integrity, screenshots, landing cards); card Blocked

## 4. Verification

- [x] 4.1 `pnpm check` green (turbo + Biome in the worktree); `openspec validate --strict`; the icons script runs and the feature graphic is committed
