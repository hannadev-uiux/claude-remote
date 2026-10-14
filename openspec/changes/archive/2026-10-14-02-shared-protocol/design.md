## Context

Ver proposal.md. O PRD (seção 10) traz um esboço; aqui ele vira contrato.

## Goals / Non-Goals

**Goals:** um único lugar com schemas e tipos inferidos (`z.infer`), usado pelos dois lados.

**Non-Goals:** geração de código, versionamento com múltiplas versões ativas.

## Decisions

- **Zod 4** com `z.discriminatedUnion("type", ...)`: inferência de tipos e validação em runtime. Alternativas: Valibot (menor bundle, ecossistema menor) e TypeBox.
- **Objetos não estritos com strip**: tolera campos novos (requisito de tolerância).
- **Entrada de transcript normalizada** (`TranscriptEntry`): `kind` em `user | assistant_text | thinking | tool_use | tool_result | system | unknown`, com `uuid`, `timestamp`, `isSidechain`, `agentId?` e payload específico. O formato bruto do `.jsonl` nunca chega ao app.
- **Cursor**: número da linha no arquivo `.jsonl` (`cursor` crescente por sessão), suficiente para retomada.
- Constante `PROTOCOL_VERSION = 1`.

## Risks / Trade-offs

- [Schemas grandes num só arquivo] → dividir em `domain.ts`, `client.ts`, `server.ts`.
