## Context

Launchers do change 04; registro do change 05.

## Decisions

- **Reutiliza o launcher** (`~/.claude-remote/bin/<perfil>`) com variável `CLAUDE_REMOTE_NO_ATTACH=1` para não tentar anexar terminal.
- **Diretórios recentes** derivados do registro de sessões + varredura de transcripts (campo `cwd`), sem decodificar o nome da pasta (ambíguo).
- **Validação de `cwd`**: deve existir, ser diretório e estar dentro do `HOME`.

## Risks / Trade-offs

- [Abrir shell remoto arbitrário] → só executa o launcher fixo; `cwd` validado.
