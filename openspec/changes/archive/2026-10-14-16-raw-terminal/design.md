## Context

`tmux capture-pane -p -e -t <pane>` retorna o conteúdo visível com escapes de cor.

## Goals / Non-Goals

**Goals:** leitura do painel; entrada via barra de teclas.

**Non-Goals:** digitação livre dentro do xterm.

## Decisions

- **Polling** de `capture-pane` a 250 ms por painel com assinantes, com hash (`xxhash` não; `crypto.createHash('sha1')`) para só enviar se mudou.
- **WebView com HTML inline** carregando xterm.js e addon-fit embarcados como string gerada no build (`scripts/build-xterm-html.ts`), sem rede. Cada quadro: `term.reset()` + `term.write(text.replace(/\n/g, '\r\n'))`.
- **Comunicação** RN → WebView por `injectJavaScript` com JSON escapado.

## Risks / Trade-offs

- [Custo de polling] → só ativo com aba aberta.
