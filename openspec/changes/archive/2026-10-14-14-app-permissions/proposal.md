## Why

Aprovar permissões e trocar o modo pelo celular destrava sessões sem voltar ao Mac (A5, A11).

## What Changes

- Cartão de permissão fixo na tela da sessão (e indicador na lista) com ferramenta, comando/arquivo, contagem regressiva e botões Permitir, Permitir sempre, Negar.
- Folha "Permitir sempre" mostrando a regra exata (editável) e o escopo (perfil/projeto) antes de confirmar.
- Seletor de modo de permissão no cabeçalho da sessão mostrando o modo confirmado; confirmação explícita ao escolher `auto`.
- Feedback háptico.

## Capabilities

### New Capabilities
- `app-permissions`: respostas a pedidos de permissão e troca de modo no app.

### Modified Capabilities

## Impact

`src/features/permissions`, `src/features/mode` no app.
