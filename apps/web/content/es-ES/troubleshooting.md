---
title: Resolución de problemas
description: Conexión, Tailscale, push, suspensión, sesiones de solo lectura, alias, WSL, versiones distintas, OpenRouter.
applies: 0.7+
---

Empieza por `remote-harness doctor` en el ordenador: comprueba las herramientas, Tailscale, la configuración, los perfiles, el almacén del token, el servicio, el push y los móviles registrados, e imprime el comando que arregla cada comprobación fallida.

## La app no se conecta

- Ambos dispositivos deben estar en la misma tailnet y Tailscale debe estar conectado en los dos. Abre la app de Tailscale en el móvil y comprueba que el ordenador aparece.
- El daemon debe estar en marcha: `remote-harness service status`, o `remote-harness start` en un terminal para ver el registro.
- Un token rotado en el ordenador (`remote-harness rotate-token`) o una reinstalación obligan a emparejar de nuevo: **Olvidar esta máquina** en Ajustes y escanear `remote-harness pair`.
- En un simulador o emulador sin Tailscale, usa `remote-harness start --dev` y `remote-harness pair --dev` (emulador de Android: `adb reverse tcp:7337 tcp:7337`).

## Tailscale no encontrado

El daemon solo escucha en una dirección 100.x. Si `doctor` dice que no hay ninguna: instala Tailscale, inicia sesión (`sudo tailscale up` en Linux) y vuelve a iniciar el daemon; el servicio en segundo plano espera la interfaz en vez de fallar. En WSL consulta [más abajo](#windows-wsl2).

## El push no llega

- La app necesita el permiso de notificaciones; Ajustes → Notificaciones muestra el estado y tiene **Enviar notificación de prueba**.
- `remote-harness push status` muestra el modo: el relay (el build de la app necesita la URL del relay), tu cuenta de servicio de Firebase en `~/.remote-harness/firebase-service-account.json`, u `off` en la configuración.
- Un perfil o una sesión puede estar silenciado: mira la fila **Silenciados** en Ajustes.
- Con el relay, cada móvil necesita un grant: `doctor` avisa cuando ninguno lo tiene.
- En Android, las notificaciones usan el canal de alta prioridad `claude-remote`; comprueba que no esté silenciado en los ajustes del sistema. Los botones Permitir y Denegar no aparecen en las notificaciones de Android: toca para responder en la app.

## El ordenador se suspende o se bloquea

El daemon solo funciona con el ordenador despierto. En un MacBook, déjalo enchufado y desactiva la suspensión con corriente, o usa `caffeinate`; en Linux revisa los ajustes de energía. Bloquear la pantalla no molesta. Las sesiones en tmux sobreviven a una desconexión de la app y se reconectan cuando vuelve.

## Las sesiones son de solo lectura

Una sesión abierta con `claude` a secas fuera de tmux aparece en la app pero no admite escritura. Toca **Reanudar** para volver a abrirla dentro de tmux, totalmente controlable, con el mismo historial. Abre siempre las sesiones con tu alias para evitarlo.

## No se encuentra el alias

Los lanzadores están en `~/.remote-harness/bin`, añadido al `PATH` en `~/.zshrc` y `~/.bashrc` por la instalación. Abre un terminal nuevo (o `source ~/.zshrc`); si el alias sigue faltando, ejecuta `remote-harness install`. Los lanzadores funcionan con `zsh`, que el instalador añade en Linux cuando falta.

## La app y el daemon tienen versiones distintas

La app avisa cuando el daemon es más antiguo de lo que necesita. Ejecuta `remote-harness update` en el ordenador (o actualiza desde la bandeja). La propia app se actualiza over-the-air cuando se compiló con un servidor de actualizaciones; Ajustes → App muestra la versión y **Buscar actualizaciones**.

## Windows (WSL2)

- **systemd**: el servicio en segundo plano necesita `[boot] systemd=true` en `/etc/wsl.conf`; la instalación muestra el comando y pide ejecutar `wsl --shutdown` desde PowerShell después.
- **Inicio al iniciar sesión**: WSL solo funciona mientras algo lo usa. La instalación puede crear la tarea programada de Windows "Remote Harness", que inicia la distribución al iniciar sesión; `remote-harness service uninstall` la quita. Si WSL sigue parándose al quedar inactivo, sube `vmIdleTimeout` en `[wsl2]` de `%UserProfile%\.wslconfig`.
- **Tailscale**: WSL2 usa NAT por defecto, así que un Tailscale en Windows no es visible dentro de WSL. O ejecuta Tailscale dentro de WSL (`curl -fsSL https://tailscale.com/install.sh | sh` y `sudo tailscale up`), o mantenlo en Windows y activa la red en espejo (Windows 11 22H2+): la instalación puede añadir `networkingMode=mirrored` en `[wsl2]` de `.wslconfig`; después ejecuta `wsl --shutdown`.
- `remote-harness doctor` muestra la distribución, el modo de red, systemd y la tarea de inicio de sesión.

## Un perfil de OpenRouter no arranca

El lanzador se niega a abrir una ventana cuando el perfil no tiene clave e imprime el comando que hay que ejecutar: `remote-harness provider key <perfil>`. `doctor` lista los perfiles con proveedor y si cada uno tiene clave. Las sesiones abiertas conservan la clave con la que empezaron; las nuevas la leen de nuevo.

## Pasar de un development build al build de la tienda

Cuando el build de TestFlight o de Google Play esté disponible, instálalo junto al build que hiciste tú: tiene otra firma, así que empieza vacío. Empareja de nuevo escaneando `remote-harness pair`; el emparejamiento antiguo sigue funcionando hasta que toques **Olvidar esta máquina** en ese build o rotes el token. El push se registra solo en el primer arranque del nuevo build, y el ordenador descarta el registro antiguo cuando deja de conectarse. Después borra el development build.

## Pedir ayuda

Abre una issue con la salida de `remote-harness doctor`, las versiones (sistema, Node, Claude Code, app) y los registros del daemon de `~/.remote-harness/logs`, tras quitar tokens y contenido de sesiones. Los problemas de seguridad van a [Seguridad y privacidad](/es/docs/security/#informar-de-una-vulnerabilidad), nunca a issues públicas.
