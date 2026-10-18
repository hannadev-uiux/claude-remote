## 1. Mark and assets

- [x] 1.1 `icons.mts`: Tether mark (regular and bold) from the prototype; app icon, adaptive + monochrome, notification, favicon, Live Activity, splash; SVG sources in `assets/icon/`
- [x] 1.2 Brand banner `docs/brand/og.png` (1200×630) with JetBrains Mono outlined from the bundled font files (opentype.js); README headers (en, pt-BR)
- [x] 1.3 Regenerate every asset and check them visually (icon, Live Activity icon and banner reviewed)

## 2. Daemon

- [x] 2.1 Setup banner: Tether in block characters, REMOTE / HARNESS, amber palette, ring glyph; logo fits 80 columns (`BANNER_WIDTH` 77); tests green
- [x] 2.2 Tray: macOS template glyph drawn from the bold mark (`Tray.swift` compiles with `swiftc`); Linux symbolic SVG + icon theme path with fallback (`tray.py` compiles)

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10; Biome on `apps packages`); `swiftc` build of `Tray.swift`; `python3 -m py_compile tray.py`
