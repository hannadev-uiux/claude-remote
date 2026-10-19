---
title: Solução de problemas
description: Conexão, Tailscale, push, suspensão, sessões somente leitura, aliases, WSL, versões diferentes, OpenRouter.
applies: 0.7+
---

Comece por `remote-harness doctor` no computador: ele confere as ferramentas, o Tailscale, a configuração, os perfis, o cofre do token, o serviço, o push e os celulares registrados, e imprime o comando que corrige cada verificação que falhou.

## O app não conecta

- Os dois aparelhos precisam estar na mesma tailnet e o Tailscale conectado nos dois. Abra o app do Tailscale no celular e confira se o computador aparece.
- O daemon precisa estar rodando: `remote-harness service status`, ou `remote-harness start` num terminal para ver o log.
- Um token trocado no computador (`remote-harness rotate-token`) ou uma reinstalação exige parear de novo: **Esquecer esta máquina** nos Ajustes e escanear `remote-harness pair`.
- Num simulador ou emulador sem Tailscale, use `remote-harness start --dev` e `remote-harness pair --dev` (emulador Android: `adb reverse tcp:7337 tcp:7337`).

## Tailscale não encontrado

O daemon só escuta num endereço 100.x. Se o `doctor` disser que não há nenhum: instale o Tailscale, entre (`sudo tailscale up` no Linux) e inicie o daemon de novo; o serviço em segundo plano espera a interface em vez de falhar. No WSL veja [abaixo](#windows-wsl2).

## O push não chega

- O app precisa da permissão de notificações; Ajustes → Notificações mostra o estado e tem **Enviar notificação de teste**.
- `remote-harness push status` mostra o modo: o relay (o build do app precisa da URL do relay), a sua conta de serviço do Firebase em `~/.remote-harness/firebase-service-account.json`, ou `off` na configuração.
- Um perfil ou sessão pode estar silenciado: veja a linha **Silenciados** nos Ajustes.
- Com o relay, cada celular precisa de um grant: o `doctor` avisa quando nenhum tem.
- No Android, as notificações usam o canal de alta prioridade `claude-remote`; confira se ele não está silenciado nos ajustes do sistema. Os botões Permitir e Negar não aparecem nas notificações do Android: toque para responder no app.

## O computador suspende ou bloqueia

O daemon só funciona com o computador acordado. Bloquear a tela não atrapalha. Por padrão, o serviço em segundo plano impede a suspensão por inatividade enquanto uma sessão está rodando ou esperando, e por 10 minutos depois; a tela continua apagando e bloqueando. Mude com `remote-harness keep-awake off`, `sessions` ou `always`; o `doctor` mostra se está segurando. Um notebook ainda suspende ao fechar a tampa, a não ser na tomada e com monitor externo. Quando o app diz que o computador não responde, ele provavelmente está dormindo: acorde-o e o app reconecta sozinho. As sessões no tmux sobrevivem a uma desconexão do app.

O app não consegue acordar um computador dormindo: os pacotes de Wake-on-LAN não atravessam o Tailscale. Se o computador aceita Wake-on-LAN (em geral pelo cabo de rede) e outro aparelho da mesma rede fica sempre ligado e está no seu tailnet (um Raspberry Pi, um NAS, um roteador com WoL), dá para acordá-lo por ele, por exemplo `ssh pi@raspberrypi wakeonlan AA:BB:CC:DD:EE:FF` com o endereço MAC do computador.

## O macOS pede acesso a pastas

Na primeira vez que uma sessão trabalha em Documentos, Mesa, Downloads ou num disco externo, o macOS pergunta se o **Remote Harness** pode acessar essa pasta: permita uma vez e vale de vez, também depois de `remote-harness update`. Para não ter um pedido por pasta, adicione o Remote Harness em Ajustes do Sistema → Privacidade e Segurança → Acesso Total ao Disco. Se o pedido mostrar **node**, faltam as Command Line Tools: rode `xcode-select --install` e depois `remote-harness service install` (o `doctor` mostra essa verificação).

## As sessões estão somente leitura

Uma sessão aberta com `claude` puro fora do tmux aparece no app mas não aceita digitação. Toque em **Retomar** para reabri-la dentro do tmux, totalmente controlável, com o mesmo histórico. Abra as sessões sempre pelo seu alias para evitar isso.

## O alias não é encontrado

Os atalhos ficam em `~/.remote-harness/bin`, adicionado ao `PATH` em `~/.zshrc` e `~/.bashrc` pela instalação. Abra um terminal novo (ou `source ~/.zshrc`); se o alias continuar faltando, rode `remote-harness install`. Os atalhos rodam com `zsh`, que o instalador adiciona no Linux quando falta.

## App e daemon em versões diferentes

O app avisa quando o daemon é mais antigo do que precisa. Rode `remote-harness update` no computador (ou atualize pela bandeja). O próprio app se atualiza over-the-air quando foi compilado com um servidor de atualizações; Ajustes → App mostra a versão e **Verificar atualizações**.

## Windows (WSL2)

- **systemd**: o serviço em segundo plano precisa de `[boot] systemd=true` em `/etc/wsl.conf`; a instalação mostra o comando e pede para rodar `wsl --shutdown` no PowerShell depois.
- **Início no logon**: o WSL só roda enquanto algo o usa. A instalação pode criar a tarefa agendada do Windows "Remote Harness", que inicia a distribuição no logon; `remote-harness service uninstall` a remove. Se o WSL ainda parar quando ocioso, aumente `vmIdleTimeout` em `[wsl2]` no `%UserProfile%\.wslconfig`.
- **Tailscale**: o WSL2 usa NAT por padrão, então um Tailscale rodando no Windows não é visível dentro do WSL. Ou rode o Tailscale dentro do WSL (`curl -fsSL https://tailscale.com/install.sh | sh` e `sudo tailscale up`), ou mantenha no Windows e ligue a rede espelhada (Windows 11 22H2+): a instalação pode adicionar `networkingMode=mirrored` em `[wsl2]` no `.wslconfig`; depois rode `wsl --shutdown`.
- `remote-harness doctor` mostra a distribuição, o modo de rede, o systemd e a tarefa de logon.

## Um perfil do OpenRouter não abre

O atalho se recusa a abrir uma janela quando o perfil não tem chave e imprime o comando para rodar: `remote-harness provider key <perfil>`. O `doctor` lista os perfis com provedor e se cada um tem chave. Sessões abertas mantêm a chave com que começaram; as novas leem de novo.

## Migrando de um development build para a build da loja

Quando a build do TestFlight ou do Google Play estiver disponível, instale-a ao lado da build que você mesmo fez: ela tem outra assinatura, então começa vazia. Pareie de novo escaneando `remote-harness pair`; o pareamento antigo continua funcionando até você tocar em **Esquecer esta máquina** naquela build ou trocar o token. O push se registra sozinho na primeira abertura da nova build, e o computador descarta o registro antigo quando ele para de conectar. Depois apague o development build.

## Pedindo ajuda

Abra uma issue com a saída de `remote-harness doctor`, as versões (sistema, Node, Claude Code, app) e os logs do daemon em `~/.remote-harness/logs`, depois de remover tokens e conteúdo de sessões. Problemas de segurança vão para [Segurança e privacidade](/pt-br/docs/security/#relatar-uma-vulnerabilidade), nunca para issues públicas.
