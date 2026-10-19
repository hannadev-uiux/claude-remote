---
title: Política de privacidad
description: Qué recopila Remote Harness (nada), qué se queda en tus dispositivos, qué sale de tu máquina y cuándo, y cómo contactarnos.
applies: 0.7+
---

Remote Harness es software autoalojado: el daemon se ejecuta en tu ordenador, la app en tu móvil, y ambos hablan por tu propia red Tailscale. Esta página es la política de privacidad de la app distribuida por las tiendas, del daemon y de este sitio web. Última actualización: 2026-10-18.

## Qué recopilamos

Nada. No hay cuenta, ni analítica, ni informes de fallos, ni telemetría en la app, en el daemon ni en este sitio. Los mantenedores nunca reciben tus conversaciones, tus archivos, tus prompts, tus tokens ni tus claves.

## Qué se queda en tus dispositivos

- En el móvil: el token de emparejamiento (en el almacenamiento seguro del sistema), las preferencias de la app (tema, idioma, nombre de la máquina, opciones de notificación) y nada de las conversaciones más allá de lo que hay en pantalla.
- En el ordenador: la configuración del daemon, la lista de sesiones conocidas, sus registros y las claves de proveedor en el almacén seguro del sistema.

Borrar la app y ejecutar `remote-harness uninstall` lo elimina todo.

## Qué sale de tu máquina, y cuándo

- **Entre tu móvil y tu ordenador**: la conversación, los permisos que respondes y los prompts que envías viajan solo por tu red Tailscale, autenticados con el token de emparejamiento. Nada de eso nos llega.
- **Notificaciones push (opcional)**: un título, el nombre del perfil, el id de la sesión y el tipo de evento pasan por Firebase Cloud Messaging (Google) hasta tu móvil; el estado en vivo añade el título de la sesión, la carpeta, el estado y la categoría del paso. El relay de push es un pequeño servicio que mantenemos, que reenvía esos mismos mensajes y no guarda nada; con tu propio proyecto de Firebase, nada pasa por nosotros. El tratamiento de Firebase Cloud Messaging por parte de Google se rige por la política de privacidad de Google.
- **Actualizaciones**: el daemon consulta el remoto de git del código instalado en busca de versiones nuevas; la app consulta el servidor de actualizaciones configurado en su build en busca de JavaScript nuevo (la petición lleva la versión de la app y la plataforma, ningún dato personal).
- **Perfiles de OpenRouter (opcional)**: las peticiones del catálogo de modelos y de créditos van de tu ordenador a OpenRouter con tu clave; ningún tráfico de modelos pasa por nosotros.
- **Este sitio web**: servido por Cloudflare, que registra peticiones como cualquier alojamiento; las fuentes vienen de Google Fonts. Sin cookies, sin analítica.

## Permisos que pide la app

- **Cámara**: para escanear el código de emparejamiento y adjuntar fotos a un prompt.
- **Micrófono y reconocimiento de voz**: para dictar prompts; la transcripción se hace en el dispositivo.
- **Notificaciones**: para el push y el estado en vivo, que puedes desactivar cuando quieras.

## Menores

Remote Harness no está dirigido a menores de 13 años y no recopila datos de nadie.

## Cambios y contacto

Esta política solo cambia a través del [repositorio](https://github.com/maarkN/remote-harness), donde su historial es público. Las preguntas van a una issue de GitHub; los informes de seguridad, a través de [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), como se describe en [Seguridad y privacidad](/es/docs/security/).
