---
title: Seguridad y privacidad
description: Qué puede hacer el daemon, qué sale de tu máquina, tokens y claves, y cómo informar de un problema.
applies: 0.7+
---

## Qué puede hacer el daemon

El daemon puede escribir en tus sesiones de Claude Code y aprobar llamadas a herramientas, así que en la práctica es un shell remoto en tu ordenador. Viene cerrado por defecto y nada de él es accesible desde internet.

## Red

- El WebSocket al que se conecta la app escucha **solo en la interfaz de Tailscale** (100.64.0.0/10), o en `127.0.0.1` con un `--dev` explícito. No hay ningún puerto en internet ni servidor de relay leyendo tus sesiones.
- Los hooks de Claude Code llegan al daemon solo por `127.0.0.1`, con un secreto local compartido.
- Exponer el daemon fuera de Tailscale con `--host` queda fuera del alcance y no tiene soporte.

## Tokens y claves

- Cada conexión presenta un token de emparejamiento guardado en el Llavero de macOS, el Secret Service de Linux (`secret-tool`) o un archivo `0600`, y en el almacenamiento seguro del móvil. `remote-harness rotate-token` lo invalida y desconecta a todos los clientes.
- Las claves de proveedor (OpenRouter) viven en el mismo almacén, en su propia cuenta. Nunca se escriben en `config.json`, `settings.json`, archivos del shell ni lanzadores, nunca se registran y nunca se envían al móvil: el lanzador lee la clave dentro de la ventana de tmux, y el daemon solo la usa para pedir al proveedor tus créditos.

## Qué sale de tu máquina

- Las notificaciones push llevan un título, el perfil y el id de la sesión. El estado en vivo añade el nombre de la sesión, la carpeta, el estado y la categoría del paso. Nunca la conversación.
- Con el relay de push, el relay ve esos mismos mensajes sin contenido y un grant sellado (tu token de FCM); no guarda nada. Con tu propio proyecto de Firebase, nada pasa por nadie más.
- El daemon no envía telemetría. La comprobación de actualizaciones habla con el remoto de git del código instalado.
- Las peticiones de catálogo y créditos de OpenRouter van del ordenador a OpenRouter, y a nadie más.

## Permisos

La app nunca ofrece el modo "bypass permissions" del agente. "Permitir siempre" escribe una regla en los ajustes del propio Claude Code, para el proyecto o para tu usuario, y `remote-harness rules undo` la revierte. Una petición sin responder vuelve al diálogo del terminal pasados unos minutos.

## Tus archivos

El instalador edita `settings.json`, `~/.zshrc` y `~/.bashrc` siempre de la misma manera: lee, fusiona, hace copia de seguridad, escribe de forma atómica. `remote-harness uninstall` quita exactamente lo que añadió. El comando `claude` a secas nunca se modifica.

## Informar de una vulnerabilidad

Por favor, no abras una issue pública. Informa en privado a través de [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new) con una descripción, el impacto, los pasos para reproducirla (versiones del sistema, de Node, de Claude Code y de la app) y cualquier corrección sugerida. Recibirás un acuse en pocos días; una vez corregida, el aviso se publica con crédito, salvo que prefieras permanecer anónimo. Solo la última versión en `main` recibe correcciones de seguridad. La política completa está en [SECURITY.md](https://github.com/maarkN/remote-harness/blob/main/SECURITY.md).
