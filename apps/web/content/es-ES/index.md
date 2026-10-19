---
title: Documentación
description: Cómo instalar, emparejar, usar y resolver problemas de Remote Harness.
---

Remote Harness te permite seguir y dirigir desde el móvil sesiones de Claude Code que se ejecutan en tmux en tu propio ordenador, a través de tu red Tailscale. Estas páginas cubren el lado del usuario; el código, la arquitectura y las especificaciones están en el [repositorio](https://github.com/maarkN/remote-harness).

## Páginas

- [Primeros pasos](/es/docs/getting-started/): requisitos, la instalación de una línea en macOS, Linux y Windows (WSL2), la app, el emparejamiento.
- [Usar la app](/es/docs/using-the-app/): lista de sesiones, conversación, prompts, permisos, terminal, sesiones y worktrees, estado en vivo, notificaciones, perfiles y OpenRouter, ajustes.
- [El daemon](/es/docs/daemon/): comandos de la CLI, el archivo de configuración, el servicio en segundo plano, actualizaciones y canales, el icono de la bandeja, registros.
- [Seguridad y privacidad](/es/docs/security/): qué puede hacer el daemon, qué sale de tu máquina, tokens y claves, cómo informar de un problema.
- [Resolución de problemas](/es/docs/troubleshooting/): conexión, Tailscale, push, suspensión, sesiones de solo lectura, WSL, versiones distintas.
- [Contribuir](/es/docs/contributing/): cómo está construido el proyecto y cómo ayudar.

## Inicio rápido

1. En el ordenador: `curl -fsSL https://remoteharness.app/install | bash` (Windows: `irm https://remoteharness.app/install | iex` en PowerShell).
2. Instala la app y Tailscale en el móvil y escanea el código QR que la instalación muestra al final.
3. Ejecuta tu alias (por ejemplo `trabajo`) en vez de `claude`. La sesión aparece en el móvil, totalmente controlable.
