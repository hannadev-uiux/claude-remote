## Context

Depende do `DaemonClient` (change 10) e do formato de URL do `pair` (change 03).

## Goals / Non-Goals

**Goals:** parear em menos de 10 segundos.

**Non-Goals:** múltiplos daemons.

## Decisions

- **`parsePairingUrl`** puro (testado) com `URL` e validação Zod.
- **`CameraView`** do `expo-camera` com `barcodeScannerSettings: { barcodeTypes: ["qr"] }`; trava após a primeira leitura válida para não disparar várias conexões.
- **Teste de conexão** com instância temporária de `DaemonClient` sem reconexão.
- **Store de credenciais** em `src/core/storage/credentials.ts` (SecureStore, chave única com JSON).
- `ws://` (não TLS): tráfego cifrado pelo WireGuard do Tailscale; `NSAppTransportSecurity` liberado para `NSAllowsLocalNetworking` e exceções de IP.

## Risks / Trade-offs

- [ATS bloqueia ws:// em IP 100.x] → `NSAllowsArbitraryLoads` restrito ao dev build pessoal (app não vai para loja).
