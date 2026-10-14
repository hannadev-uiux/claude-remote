## 1. Parser

- [x] 1.1 Criar fixtures `.jsonl` anonimizadas a partir de transcripts reais; verificar presença em `test/fixtures`
- [x] 1.2 Implementar `parseTranscriptLine` puro com todos os tipos e truncamento; verificar com testes cobrindo cada tipo, linha inválida e tipo desconhecido

## 2. Leitura e tail

- [x] 2.1 Implementar leitor incremental por offset com buffer de linha parcial e índice de linhas; verificar com teste que anexa ao arquivo em partes
- [x] 2.2 Implementar watcher chokidar por sessão assinada com contagem de assinantes; verificar com teste de integração em diretório temporário

## 3. Protocolo

- [x] 3.1 Registrar `session.subscribe`/`session.unsubscribe` com `sinceCursor` e `session.history`; verificar com teste WS de retomada sem duplicatas
