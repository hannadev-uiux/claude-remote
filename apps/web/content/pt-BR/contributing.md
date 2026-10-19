---
title: Contribuindo
description: Como o projeto é construído, como preparar o ambiente e como ajudar.
---

Relatos de bugs, ideias, documentação e código são todos bem-vindos. O [CONTRIBUTING.md](https://github.com/maarkN/remote-harness/blob/main/CONTRIBUTING.md) do repositório tem o fluxo completo; esta página é a versão curta.

## Como é construído

Um monorepo pnpm em TypeScript estrito: o daemon (`apps/daemon`, Node), o app (`apps/mobile`, Expo e React Native), o relay de push (`apps/push-relay`, uma Cloud Function), este site (`apps/web`, um Worker do Cloudflare) e o protocolo WebSocket que eles compartilham (`packages/protocol`, schemas Zod). Toda funcionalidade começa como um change do [OpenSpec](https://github.com/Fission-AI/OpenSpec) com proposta, deltas de spec e tarefas; os changes arquivados são a história do projeto. Arquitetura e convenções estão em [CLAUDE.md](https://github.com/maarkN/remote-harness/blob/main/CLAUDE.md).

## Preparação

macOS ou Linux com Node 24+, pnpm 12+, tmux, git, ripgrep e zsh; Xcode num Mac para iOS, o Android SDK com JDK 17 para Android.

```bash
pnpm install
pnpm check                                             # typecheck + testes + Biome, precisa passar
pnpm --filter @remote-harness/daemon dev start --dev    # daemon do código-fonte em 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app no simulador iOS
pnpm --filter @remote-harness/mobile android           # app num emulador Android
```

## Fluxo

1. Para qualquer coisa maior que uma correção pequena, abra uma issue antes.
2. Crie a branch a partir de `development` (`feat/<tema>`, `fix/<tema>`, `docs/<tema>`); `main` só guarda releases.
3. Mudanças de comportamento começam como um change do OpenSpec (`openspec validate <change> --strict`), escrito em inglês.
4. Texto de interface passa pelos catálogos tipados em pt-BR, en-US e es-ES; lógica pura ganha testes Vitest.
5. Faça commits em Conventional Commits e abra um pull request contra `development`.

## Relatando bugs

Use o template de issue e inclua `remote-harness doctor`, as versões (sistema, Node, Claude Code, app) e os logs do daemon em `~/.remote-harness/logs`, sem tokens nem conteúdo de sessões. Problemas de segurança vão pelos [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), nunca por issues públicas.

## Licença

MIT. Ao contribuir, você concorda que as suas contribuições são licenciadas do mesmo jeito.
