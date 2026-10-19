## 1. Updates server

- [x] 1.1 `apps/web/src/updates/protocol.ts` and `validate.ts` (Zod): request parsing, headers, multipart body, publish body and manifest checks, with tests ported from the current server
- [x] 1.2 `auth.ts` (constant-time bearer check, development token limited to `development`) and the R2 store (`assets/`, `manifests/` history, `latest/` pointer), with tests
- [x] 1.3 `handler.ts`: manifest, assets (GET, HEAD, PUT) and manifests (POST) over a store interface; tests with an in-memory store for every scenario of the spec
- [x] 1.4 Routes, `index.ts`, `cloudflare.config.ts` (bucket `remote-harness-updates`, `UPDATES_TOKEN` and `UPDATES_DEV_TOKEN` secrets); the proxy to `maarkn.dev` removed

## 2. Links

- [x] 2.1 `/og.png` served by the Worker and the meta tags pointing to it; tests
- [x] 2.2 App: `remoteharness://` scheme next to `claude-remote://`, pairing parser accepts both; tests
- [x] 2.3 CI workflow and README without the `maarkn.dev` assets URL; the publisher docs; change 27's design note

## 3. Verify

- [x] 3.1 Publisher against the Worker in local dev (dry run plus a real upload to the local R2, manifest fetched as the app would); `pnpm check` and `openspec validate --strict`
