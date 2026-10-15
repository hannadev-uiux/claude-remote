## Purpose

Instala e configura o Claude Remote no Mac com um comando e um assistente guiado.

## ADDED Requirements

### Requirement: Instalação por uma linha
`install.sh` SHALL instalar ou atualizar o código em `~/.claude-remote/src`, compilar o daemon e abrir o assistente, falhando com mensagem clara fora do macOS, sem Node 24+ ou sem git. `tmux` e `ripgrep` ausentes MUST ser instalados via Homebrew quando disponível.

#### Scenario: Primeira instalação
- **WHEN** o usuário roda `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash`
- **THEN** o código é baixado, compilado e o assistente começa

#### Scenario: Atualização
- **WHEN** o script roda com o código já instalado e sem mudanças locais
- **THEN** o código vai para o ref pedido e é recompilado

#### Scenario: Sem terminal
- **WHEN** não há `/dev/tty`
- **THEN** a configuração roda sem perguntas, com os perfis detectados

### Requirement: Assistente de perfis
`claude-remote setup` SHALL mostrar a logo, detectar os diretórios de configuração do Claude Code, deixar escolher os perfis e definir alias e nome de cada um, e só gravar após confirmação. O alias MUST ser válido, único e diferente de `claude` e `claude-remote`.

#### Scenario: Duas contas
- **WHEN** existem `~/.claude` e `~/.claude-work` e o usuário escolhe os aliases `pessoal` e `trabalho`
- **THEN** o `config.json` passa a ter os dois perfis e os comandos `pessoal` e `trabalho` abrem o Claude Code de cada conta no tmux

#### Scenario: Alias inválido
- **WHEN** o usuário digita `claude` como alias
- **THEN** o assistente recusa e pede outro

#### Scenario: Perfil removido
- **WHEN** um perfil configurado é desmarcado
- **THEN** o launcher e os hooks dele são removidos

### Requirement: Redirect do instalador
`https://maarkn.dev/claude-remote/install.sh` SHALL redirecionar temporariamente para o `install.sh` da branch `main` no GitHub.

#### Scenario: curl
- **WHEN** `curl -fsSL https://maarkn.dev/claude-remote/install.sh` é executado
- **THEN** o conteúdo do script é baixado

### Requirement: Tutorial no app
A tela de pareamento SHALL oferecer um passo a passo para quem instalou o app antes de configurar o Mac: instalar o Tailscale no iPhone (link da App Store) e no Mac na mesma conta, instalar o Claude Remote no Mac com o comando de uma linha (que pode ser compartilhado, por exemplo via AirDrop) e parear pelo QR.

#### Scenario: App instalado primeiro
- **WHEN** o usuário abre o app sem pareamento e toca em "Primeira vez? Configure o Mac"
- **THEN** vê os passos na ordem, com o comando de instalação pronto para compartilhar e um atalho de volta para o leitor de QR
