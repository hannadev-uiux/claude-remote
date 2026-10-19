---
title: Documentação
description: Como instalar, parear, usar e resolver problemas do Remote Harness.
---

O Remote Harness permite acompanhar e comandar, pelo celular, sessões do Claude Code que rodam no tmux do seu próprio computador, pela sua rede Tailscale. Estas páginas cobrem o lado de quem usa; o código, a arquitetura e as especificações estão no [repositório](https://github.com/maarkN/remote-harness).

## Páginas

- [Primeiros passos](/pt-br/docs/getting-started/): requisitos, a instalação de uma linha no macOS, Linux e Windows (WSL2), o app, o pareamento.
- [Usando o app](/pt-br/docs/using-the-app/): lista de sessões, conversa, prompts, permissões, terminal, sessões e worktrees, status ao vivo, notificações, perfis e OpenRouter, ajustes.
- [O daemon](/pt-br/docs/daemon/): comandos da CLI, o arquivo de configuração, o serviço em segundo plano, atualizações e canais, o ícone na bandeja, logs.
- [Segurança e privacidade](/pt-br/docs/security/): o que o daemon pode fazer, o que sai da sua máquina, tokens e chaves, como relatar um problema.
- [Solução de problemas](/pt-br/docs/troubleshooting/): conexão, Tailscale, push, suspensão, sessões somente leitura, WSL, versões diferentes.
- [Contribuindo](/pt-br/docs/contributing/): como o projeto é construído e como ajudar.

## Começo rápido

1. No computador: `curl -fsSL https://remoteharness.app/install.sh | bash` (Windows: `irm https://remoteharness.app/install.ps1 | iex` no PowerShell).
2. Instale o app e o Tailscale no celular e escaneie o QR code que a instalação mostra no fim.
3. Rode o seu alias (por exemplo `trabalho`) em vez de `claude`. A sessão aparece no celular, totalmente controlável.
