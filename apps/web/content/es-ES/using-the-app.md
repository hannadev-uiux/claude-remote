---
title: Usar la app
description: Lista de sesiones, conversación, prompts, permisos, terminal, sesiones y worktrees, estado en vivo, notificaciones, perfiles y OpenRouter, ajustes.
applies: 0.7+
---

## Lista de sesiones

La pantalla de inicio lista las sesiones de todos los perfiles del ordenador emparejado, de la actividad más reciente a la más antigua (el chip de orden cambia a agrupar por estado). Cada fila muestra la insignia del agente, el título, la carpeta y la rama, el estado (`en marcha`, `esperando`, `parada`, `terminada`) y la etiqueta del perfil; los chips filtran por perfil. Una franja **Esperándote** arriba reúne las peticiones de permiso, con Permitir, Siempre y Denegar ahí mismo. Desliza una fila para las acciones rápidas (cerrar o reanudar, silenciar, fijar); mantén pulsado o abre el menú de la fila para el resto (copiar la ruta, ocultar una sesión terminada, limpiar su worktree). Las sesiones que comparten un checkout de git con otra sesión en vivo quedan marcadas, porque pueden pisarse los archivos.

La línea bajo el título nombra la máquina (renómbrala en Ajustes) y cuántas sesiones tiene; el botón `+` abre una sesión nueva.

## Conversación

Abre una sesión para leer la conversación según ocurre: prompts, el texto del agente en Markdown, el razonamiento, las llamadas a herramientas con sus resultados, diffs e imágenes, paginados hasta el principio. Bajo la cabecera, la primera línea de contexto muestra la insignia del agente, el perfil, la carpeta (tócala para los detalles de la sesión), el estado y el modo de permisos; la segunda muestra el modelo (con el nivel de esfuerzo), el proveedor cuando el perfil tiene uno, la rama, el uso de la ventana de contexto y los límites de uso de la cuenta. Tócala para ver los números.

**Historial de la conversación** (en el menú) lista tus prompts del más reciente al más antiguo y salta a uno. **Seguir la salida** mantiene la vista al final mientras el agente trabaja; desplázate hacia arriba para pausarlo.

## Enviar prompts

Escribe en el compositor y envía. Mientras el agente está ocupado el prompt entra en la cola y se entrega en orden cuando termina el turno; la tarjeta **Cola** permite editar, reordenar, quitar o enviar ya un elemento. Mantén pulsado el botón de enviar (o pulsa ⌘⏎ con un teclado) para enviarlo al instante, como Ctrl+Enter en el terminal.

- `@` completa archivos del proyecto, `/` completa los comandos de barra de Claude Code.
- El botón de la cámara adjunta fotos; el micrófono dicta en el dispositivo (elige el idioma en Ajustes → Voz).
- **Mostrar atajos de teclado** (menú) añade una barra con Esc, Ctrl+C, las flechas, Tab e Intro para los menús del propio agente.

## Permisos

Cuando el agente pide permiso, la app muestra la herramienta y el comando o archivo, con **Permitir**, **Denegar** y **Siempre**. "Siempre" escribe una regla en los ajustes del agente, para el proyecto o para tu usuario, exactamente como haría el diálogo del terminal; `remote-harness rules list` y `remote-harness rules undo <id>` en el ordenador las revisan y revierten. El daemon espera tu respuesta unos minutos antes de dejar que el diálogo del terminal tome el control, así que una petición sin responder nunca bloquea la sesión para siempre. Cuando el agente hace una pregunta con opciones, las opciones también se muestran.

El chip de **modo** cambia el modo de permisos: predeterminado, aceptar ediciones, plan y auto. La app nunca ofrece "bypass permissions".

## Terminal en bruto

**Ver terminal** (menú, o el botón de terminal en la cabecera) muestra el propio panel de tmux, para menús y todo lo que la vista estructurada no cubre, con la misma barra de teclas. En las sesiones de solo lectura (sin panel de tmux) no se puede escribir.

## Subagentes

Mientras el agente delega trabajo, el menú de la cabecera muestra **Subagentes (N · M en marcha)**; la hoja lista cada uno con su descripción, estado, número de herramientas y hora de inicio, además de las tareas en segundo plano.

## Abrir, reanudar y cerrar sesiones

**Nueva sesión** (el botón `+`) pide el perfil, el modelo cuando el perfil tiene un proveedor, y el directorio: escríbelo con autocompletado, navega por las carpetas o elige uno reciente (con su rama y cuántas veces se usó esta semana). Activa **Copia aislada (git worktree)** para abrir Claude Code con `--worktree`: trabaja en su propia rama en `<repo>/.claude/worktrees/<nombre>`, así dos sesiones pueden compartir un repositorio sin tocarse. Abrir en un checkout que otra sesión en vivo ya usa pide confirmación antes.

**Reanudar** vuelve a abrir una sesión terminada o de solo lectura dentro de tmux, con el mismo historial. **Cerrar** termina la sesión; cuando se ejecutó en un worktree, la app ofrece borrarlo solo si está limpio y subido, hacer commit y push antes, o descartar el trabajo, preguntando dos veces antes de descartar nada.

## Estado en vivo

En iOS, una sesión en marcha muestra una Live Activity en la pantalla de bloqueo y en la Dynamic Island con el estado, el paso actual y el tiempo transcurrido; una petición de permiso añade los botones Permitir y Denegar. En Android es una notificación silenciosa sin botones: tócala para responder en la app. Nunca lleva la conversación. Desactívalo en Ajustes → Notificaciones → Estado en vivo.

## Notificaciones y silencio

Las notificaciones push avisan cuando una sesión necesita un permiso, termina un turno o hace una pregunta; llevan un título, el perfil y el id de la sesión, nunca el contenido. Ajustes → Notificaciones tiene el interruptor de este móvil, un botón de prueba y el interruptor del estado en vivo. Silencia un perfil o una sesión desde su fila o desde el menú de la sesión; la fila **Silenciados** de Ajustes lista todo lo silenciado.

## Perfiles y OpenRouter

Un perfil es una cuenta de Claude Code, es decir un `CLAUDE_CONFIG_DIR`, con nombre, color y alias. Un perfil también puede enrutar Claude Code por **OpenRouter**: sus filas muestran un chip discontinuo `vía OpenRouter`, **Nueva sesión** gana una fila **Modelo** con un selector con búsqueda (tamaño del contexto, precios por millón de tokens, soporte de herramientas, razonamiento y caché, créditos restantes), y **Cambiar modelo…** en el menú de la sesión cambia una sesión en marcha. La clave se queda en el ordenador: consulta [el daemon](/es/docs/daemon/#perfiles-y-openrouter).

## Ajustes

- **Máquina**: la conexión, el nombre de la máquina (un alias a tu elección, si no su hostname), la versión del daemon y **Olvidar esta máquina**.
- **Apariencia**: Sistema, Oscuro, Claro, Dracula, Catppuccin Mocha y Catppuccin Latte.
- **Perfiles**: cada perfil con su agente, alias, carpeta de config, interruptor de notificaciones y, con proveedor, el proveedor, el modelo predeterminado y los créditos.
- **Notificaciones**: push para este móvil, prueba, estado en vivo, los perfiles y sesiones silenciados.
- **Voz**: el idioma de la transcripción.
- **App**: versión, actualizaciones over-the-air y su canal, **Buscar actualizaciones**, **Documentación**, **Informar de un problema**.

## iPad y teclados

En un iPad (o cualquier pantalla ancha) la lista y la conversación van lado a lado, y un panel inspector aloja el terminal, los subagentes y los detalles de la sesión. Con un teclado físico, ⌘⏎ envía ya, Intro envía o inserta un salto de línea según el ajuste del compositor, y los atajos aparecen en las pistas de teclas.
