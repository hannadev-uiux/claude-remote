## Why

O app precisa saber onde está o daemon e qual token usar sem digitação manual de token longo (A1).

## What Changes

- Tela de pareamento com leitor de QR (`expo-camera`) para a URL `claude-remote://pair?...`.
- Entrada manual de host, porta e token como alternativa.
- Teste de conexão antes de salvar; credenciais no `expo-secure-store`.
- Tela de configurações com dados do pareamento, "esquecer daemon" e versão.

## Capabilities

### New Capabilities
- `app-pairing`: pareamento do app com o daemon e guarda segura das credenciais.

### Modified Capabilities

## Impact

`src/features/pairing`, `src/features/settings`; dependências `expo-camera`, `expo-secure-store`.
