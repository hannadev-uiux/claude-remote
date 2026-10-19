---
title: Segurança e privacidade
description: O que o daemon pode fazer, o que sai da sua máquina, tokens e chaves, e como relatar um problema.
applies: 0.7+
---

## O que o daemon pode fazer

O daemon pode digitar nas suas sessões do Claude Code e aprovar chamadas de ferramenta, então ele é na prática um shell remoto no seu computador. Vem trancado por padrão e nada nele é alcançável pela internet.

## Rede

- O WebSocket ao qual o app conecta escuta **só na interface do Tailscale** (100.64.0.0/10), ou em `127.0.0.1` com um `--dev` explícito. Não há porta na internet nem servidor de relay lendo suas sessões.
- Os hooks do Claude Code chegam ao daemon só por `127.0.0.1`, com um segredo local compartilhado.
- Expor o daemon fora do Tailscale com `--host` está fora do escopo e não tem suporte.

## Tokens e chaves

- Toda conexão apresenta um token de pareamento guardado no Keychain do macOS, no Secret Service do Linux (`secret-tool`) ou num arquivo `0600`, e no armazenamento seguro do celular. `remote-harness rotate-token` o invalida e derruba todos os clientes.
- Chaves de provedor (OpenRouter) ficam no mesmo cofre, numa conta própria. Nunca são gravadas em `config.json`, `settings.json`, arquivos do shell ou atalhos, nunca vão para o log e nunca são enviadas ao celular: o atalho lê a chave dentro da janela do tmux, e o daemon só a usa para pedir ao provedor os seus créditos.

## O que sai da sua máquina

- As notificações push levam um título, o perfil e o id da sessão. O status ao vivo acrescenta o nome da sessão, a pasta, o estado e a categoria do passo. Nunca a conversa.
- Com o relay de push, o relay vê essas mesmas mensagens sem conteúdo e um grant selado (o seu token do FCM); ele não guarda nada. Com o seu próprio projeto Firebase, nada passa por mais ninguém.
- O daemon não envia telemetria. A verificação de atualização fala com o remoto git do código instalado.
- Os pedidos de catálogo e créditos do OpenRouter vão do computador para o OpenRouter, e para mais ninguém.

## Permissões

O app nunca oferece o modo "bypass permissions" do agente. O "permitir sempre" grava uma regra nas configurações do próprio Claude Code, para o projeto ou para o seu usuário, e `remote-harness rules undo` a desfaz. Um pedido sem resposta volta para o diálogo do terminal depois de alguns minutos.

## Os seus arquivos

O instalador edita `settings.json`, `~/.zshrc` e `~/.bashrc` sempre do mesmo jeito: lê, mescla, faz backup, grava de forma atômica. `remote-harness uninstall` remove exatamente o que foi adicionado. O comando `claude` puro nunca é alterado.

## Relatar uma vulnerabilidade

Por favor não abra uma issue pública. Relate em privado pelos [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new) com uma descrição, o impacto, os passos para reproduzir (versões do sistema, do Node, do Claude Code e do app) e qualquer sugestão de correção. Você recebe uma confirmação em poucos dias; corrigido, o aviso é publicado com crédito, a menos que prefira ficar anônimo. Só a versão mais recente em `main` recebe correções de segurança. A política completa está em [SECURITY.md](https://github.com/maarkN/remote-harness/blob/main/SECURITY.md).
