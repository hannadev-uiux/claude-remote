## Why

Menus e diálogos da TUI não aparecem no transcript; sem ver o painel, o usuário fica cego quando algo inesperado acontece (D10, A8).

## What Changes

- Daemon: `pane.subscribe { sessionId }` envia `pane.frame` com o conteúdo do painel (com cores ANSI) sempre que muda, em até 4 quadros por segundo.
- App: aba "Terminal" na sessão com xterm.js numa WebView, mostrando o painel e com barra de teclas.

## Capabilities

### New Capabilities
- `raw-terminal`: espelho do painel tmux no app.

### Modified Capabilities

## Impact

Módulo `features/pane` no daemon; `src/features/terminal` no app; dependência `react-native-webview`, xterm.js embarcado como HTML.
