---
title: Política de privacidade
description: O que o Remote Harness coleta (só os relatórios de erro que você aceitar enviar), o que fica nos seus aparelhos, o que sai da sua máquina e quando, e como falar conosco.
applies: 0.7+
---

O Remote Harness é um software self-hosted: o daemon roda no seu computador, o app no seu celular, e os dois conversam pela sua própria rede Tailscale. Esta página é a política de privacidade do app distribuído pelas lojas, do daemon e deste site. Última atualização em 2026-10-19.

## O que coletamos

Só os relatórios de erro que você aceitar enviar. Não há conta, analytics nem telemetria no app, no daemon ou neste site. Os mantenedores nunca recebem as suas conversas, os seus arquivos, os seus prompts, os seus tokens ou as suas chaves.

**Relatórios de erro (opcionais).** O app guarda no celular um pequeno registro dos próprios erros. Ele os envia ao Firebase Crashlytics (Google) só como você escolher em Configurações → Relatórios de erro: depois de perguntar, que é o padrão, automaticamente, ou nunca. Um relatório tem a hora e o tipo do erro, o nome do erro, a mensagem e a pilha já filtradas, o tipo da requisição que falhou e o código do erro, o padrão da rota da tela, e as versões do app, da atualização, do sistema e do daemon; o Crashlytics acrescenta o modelo do aparelho e um id de instalação. Os relatórios nunca incluem prompts, conversa, saída do terminal, comandos, caminhos de arquivos, nomes de projetos ou sessões, tokens ou dados de pareamento. Em Configurações → Relatar um problema você também pode compartilhar um relatório ou abri-lo como issue no GitHub. O tratamento dos dados do Crashlytics pelo Google é coberto pela política de privacidade do Google.

## O que fica nos seus aparelhos

- No celular: o token de pareamento (no armazenamento seguro do sistema), as preferências do app (tema, idioma, nome da máquina, escolhas de notificação), os rascunhos de prompts não enviados de cada sessão (no armazenamento seguro do sistema, nunca enviados a lugar nenhum, apagados ao enviar, depois de 7 dias ou ao esquecer a máquina) e nada mais das conversas além do que está na tela.
- No computador: a configuração do daemon, a lista de sessões conhecidas, os logs e as chaves de provedor no cofre do sistema.

Apagar o app e rodar `remote-harness uninstall` remove tudo isso.

## O que sai da sua máquina, e quando

- **Entre o seu celular e o seu computador**: a conversa, as permissões que você responde e os prompts que envia trafegam só pela sua rede Tailscale, autenticados com o token de pareamento. Nada disso chega até nós.
- **Notificações push (opcional)**: um título, o nome do perfil, o id da sessão e o tipo do evento passam pelo Firebase Cloud Messaging (Google) até o seu celular; o status ao vivo acrescenta o título da sessão, a pasta, o estado e a categoria do passo. O relay de push é um serviço pequeno que mantemos, que encaminha essas mesmas mensagens e não guarda nada; com o seu próprio projeto Firebase, nada passa por nós. O tratamento do Firebase Cloud Messaging pelo Google segue a política de privacidade do Google.
- **Atualizações**: o daemon consulta o remoto git do código instalado em busca de versões novas; o app consulta o servidor de atualizações configurado na sua build em busca de JavaScript novo (o pedido leva a versão do app e a plataforma, nenhum dado pessoal).
- **Perfis do OpenRouter (opcional)**: os pedidos de catálogo de modelos e de créditos vão do seu computador para o OpenRouter com a sua chave; nenhum tráfego de modelo passa por nós.
- **Este site**: servido pela Cloudflare, que registra requisições como qualquer hospedagem; as fontes vêm do Google Fonts. Sem cookies, sem analytics.

## Permissões que o app pede

- **Câmera**: para escanear o código de pareamento e anexar fotos a um prompt.
- **Microfone e reconhecimento de fala**: para ditar prompts; a transcrição roda no aparelho.
- **Notificações**: para o push e o status ao vivo, que você pode desligar quando quiser.

## Crianças

O Remote Harness não é dirigido a crianças menores de 13 anos e não coleta dados de ninguém.

## Mudanças e contato

Esta política só muda pelo [repositório](https://github.com/maarkN/remote-harness), onde o histórico é público. Dúvidas vão para uma issue no GitHub; relatos de segurança vão pelos [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), como descrito em [Segurança e privacidade](/pt-br/docs/security/).
