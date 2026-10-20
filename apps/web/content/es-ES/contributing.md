---
title: Contribuir
description: Cómo está construido el proyecto, cómo prepararlo y cómo ayudar.
---

Los informes de errores, las ideas, la documentación y el código son todos bienvenidos. El [CONTRIBUTING.md](https://github.com/maarkN/remote-harness/blob/main/CONTRIBUTING.md) del repositorio tiene el flujo completo; esta página es la versión corta.

## Cómo está construido

Un monorepo de pnpm en TypeScript estricto: el daemon (`apps/daemon`, Node), la app (`apps/mobile`, Expo y React Native), el relay de push (`apps/push-relay`, una Cloud Function), este sitio (`apps/web`, un servidor Node en Docker) y el protocolo WebSocket que comparten (`packages/protocol`, esquemas Zod). Cada funcionalidad empieza como un change de [OpenSpec](https://github.com/Fission-AI/OpenSpec) con propuesta, deltas de spec y tareas; los changes archivados son la historia del proyecto. La arquitectura y las convenciones están en [CLAUDE.md](https://github.com/maarkN/remote-harness/blob/main/CLAUDE.md).

## Preparación

macOS o Linux con Node 24+, pnpm 12+, tmux, git, ripgrep y zsh; Xcode en un Mac para iOS, el Android SDK con JDK 17 para Android.

```bash
pnpm install
pnpm check                                             # typecheck + tests + Biome, debe pasar
pnpm --filter @remote-harness/daemon dev start --dev    # daemon desde el código en 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app en el simulador de iOS
pnpm --filter @remote-harness/mobile android           # app en un emulador de Android
```

## Flujo

1. Para cualquier cosa mayor que una corrección pequeña, abre antes una issue.
2. Crea la rama desde `development` (`feat/<tema>`, `fix/<tema>`, `docs/<tema>`); `main` solo contiene versiones publicadas.
3. Los cambios de comportamiento empiezan como un change de OpenSpec (`openspec validate <change> --strict`), escrito en inglés.
4. El texto de la interfaz pasa por los catálogos tipados en pt-BR, en-US y es-ES; la lógica pura lleva tests de Vitest.
5. Haz commits con Conventional Commits y abre un pull request contra `development`.

## Informar de errores

Usa la plantilla de issue e incluye `remote-harness doctor`, las versiones (sistema, Node, Claude Code, app) y los registros del daemon de `~/.remote-harness/logs`, sin tokens ni contenido de sesiones. Los problemas de seguridad van por [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), nunca por issues públicas.

## Licencia

MIT. Al contribuir aceptas que tus contribuciones se licencien de la misma manera.
