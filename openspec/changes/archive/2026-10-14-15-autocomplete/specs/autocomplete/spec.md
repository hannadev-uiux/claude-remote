## Purpose

Oferece no app sugestões de arquivos (`@`) e de skills/comandos (`/`) equivalentes às da TUI do Claude Code.

## ADDED Requirements

### Requirement: Busca de arquivos
`files.search { sessionId, query, limit }` SHALL retornar até `limit` (padrão 20) arquivos e pastas do `cwd` da sessão que casem com `query` por busca fuzzy, ignorando o que o `.gitignore` exclui.

#### Scenario: Busca parcial
- **WHEN** o app busca "mainap" numa sessão com `src/main/app.ts`
- **THEN** o resultado inclui `src/main/app.ts` com `kind: "file"`

#### Scenario: Pastas
- **WHEN** o app busca "src/comp"
- **THEN** o resultado inclui `src/components/` com `kind: "dir"`

#### Scenario: node_modules ignorado
- **WHEN** `node_modules` está no `.gitignore`
- **THEN** nenhum caminho dentro dele aparece

### Requirement: Lista de comandos
`commands.list { sessionId }` SHALL retornar comandos com `name`, `description` e `source` (`builtin`, `profile`, `project`, `plugin`), lidos do frontmatter de `skills/*/SKILL.md` e `commands/**/*.md` do perfil, do projeto (`.claude/`) e dos plugins instalados do perfil, mais a lista fixa de nativos.

#### Scenario: Skill do projeto
- **WHEN** o projeto tem `.claude/skills/deploy/SKILL.md` com `name: deploy`
- **THEN** a lista contém `/deploy` com `source: "project"`

#### Scenario: Cache invalidado
- **WHEN** um novo `SKILL.md` é criado no perfil
- **THEN** a próxima chamada já o inclui

### Requirement: Sugestões no app
Ao digitar `@` ou `/` (no início do prompt para `/`), o app SHALL mostrar sugestões acima do teclado, atualizando com debounce de 150 ms, e inserir `@caminho` ou `/nome ` ao tocar.

#### Scenario: Escolher arquivo
- **WHEN** o usuário digita "@app" e toca em `src/app.ts`
- **THEN** o texto vira "@src/app.ts "

### Requirement: Comandos interativos
Ao enviar um comando nativo marcado como interativo (`/model`, `/config`, `/permissions`, `/agents`, `/mcp`, `/resume`, `/login`), o app SHALL enviá-lo e abrir o terminal bruto da sessão.

#### Scenario: /model
- **WHEN** o usuário envia "/model"
- **THEN** o comando é enviado e a aba de terminal bruto abre
