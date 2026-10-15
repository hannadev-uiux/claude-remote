## 1. Assistente

- [x] 1.1 Extrair a rotina de `install` para `features/setup/install.ts` e reutilizá-la no comando; verificar com os testes existentes
- [x] 1.2 Lógica pura de perfis (detecção, sugestões, validação de alias, mescla do config); verificar com testes
- [x] 1.3 Logo e tema no estilo do Claude Code; verificar com teste de largura e visualmente
- [x] 1.4 Comando `setup` interativo e `--yes`; verificar rodando com HOME temporário

## 2. Instalação por uma linha

- [x] 2.1 `install.sh` (pré-requisitos, código, build, assistente via `/dev/tty`); verificar com `bash -n` e uma instalação completa em HOME temporário
- [x] 2.2 README (en/pt-BR) com o comando de uma linha; verificar a leitura

## 3. App

- [x] 3.1 Passo a passo de primeira configuração acessível pela tela de pareamento; verificar com typecheck, teste do conteúdo e no simulador

## 4. Site

- [x] 4.1 Redirect em `maarkn.dev` (`next.config.ts`) com teste; verificar com o teste e `next build`
