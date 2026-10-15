## Decisions

- **Bootstrap em bash, assistente em TypeScript.** O `install.sh` só garante pré-requisitos, código e build (tudo dentro de `main()`, para um download parcial nunca executar). As perguntas ficam no `claude-remote setup`, que reaproveita o schema do config, a escrita atômica e os instaladores, e tem a lógica pura testada.
- **`curl | bash` e o stdin.** O stdin do bash é o próprio script, então o assistente lê de `/dev/tty`. Sem terminal (CI), roda `setup --yes`.
- **Prompts com `@inquirer/prompts`** e tema próprio (cursor `❯`, destaque laranja `#D97757`), parecido com os menus do Claude Code.
- **Detecção de perfis:** diretórios `~/.claude` e `~/.claude-*` no home. Sugestões: perfis já configurados mantêm id/nome; `~/.claude` sugere `claudin`/"Pessoal"; `~/.claude-<x>` sugere `claude-<x>`/"<X>".
- **Validação do alias:** `^[a-z][a-z0-9_-]{0,31}$`, único, e nunca `claude` nem `claude-remote` (o launcher chama `claude`, e o diretório dele vem antes no PATH). Se o alias já for um comando do sistema, o assistente avisa e pede confirmação.
- **Remoção:** perfis que saem do config têm launcher e hooks removidos, sem tocar no resto.
- **Código em `~/.claude-remote/src`** (clone raso). Atualização faz `fetch` + `checkout` do ref e recusa se houver mudanças locais.
- **Redirect no site** via `redirects()` do `next.config.ts` (307, não cacheado), apontando para `raw.githubusercontent.com/.../main/install.sh`. O proxy de idioma já ignora caminhos com ponto.
