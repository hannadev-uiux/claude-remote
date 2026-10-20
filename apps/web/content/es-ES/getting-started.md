---
title: Primeros pasos
description: Requisitos, la instalación de una línea en macOS, Linux y Windows (WSL2), la app y el emparejamiento.
applies: 0.7+
---

## Requisitos

- Un ordenador con macOS, Linux (systemd recomendado) o Windows 10 2004+ / 11 mediante WSL2, con `tmux`, `git`, `rg` (ripgrep), `zsh` y `claude` en el `PATH`. El instalador añade las herramientas que falten.
- Node 24+. El instalador descarga un Node privado en `~/.remote-harness/node` cuando falta, sin tocar el Node del sistema.
- [Tailscale](https://tailscale.com) en el ordenador y en el móvil, con la misma cuenta (misma tailnet).
- Un iPhone o iPad (iOS 17+) o un móvil Android (Android 10+).

## Instalar en el ordenador

Una dirección para todos los sistemas: `https://remoteharness.app/install` entrega a curl el script de macOS / Linux y a PowerShell el de Windows. Abierta en el navegador del ordenador, muestra el comando correcto con un botón de copiar. Añade `?ref=<rama|tag>` para otra versión, por ejemplo `curl -fsSL "https://remoteharness.app/install?ref=development" | bash`.

### macOS y Linux

```bash
curl -fsSL https://remoteharness.app/install | bash
```

El instalador comprueba el sistema y Node, instala las herramientas que faltan (Homebrew en macOS; apt, dnf, pacman o zypper en Linux, con `sudo` tras explicar el motivo), deja el código en `~/.remote-harness/src`, compila el daemon y abre la instalación guiada (`remote-harness setup`), que:

- encuentra tus cuentas de Claude Code (`~/.claude`, `~/.claude-*`) y te deja elegir cuáles controlar, o crea una nueva y abre Claude Code en ella para que inicies sesión;
- pregunta el alias de cada una: el comando que abre esa cuenta dentro de tmux (por ejemplo `personal`, `trabajo`);
- puede añadir un [perfil de OpenRouter](/es/docs/daemon/#perfiles-y-openrouter): Claude Code pagado con tu clave de OpenRouter, que comprueba y guarda en el almacén de secretos del sistema;
- instala los lanzadores, la entrada en el `PATH` y los hooks (con copias de seguridad), y el servicio en segundo plano;
- ayuda con Tailscale y muestra el código QR de emparejamiento.

Opciones: `bash -s -- --yes` se salta las preguntas, `bash -s -- --ref <rama|etiqueta>` instala otra versión, `bash -s -- --update` actualiza sin la instalación guiada.

### Windows (WSL2)

Remote Harness controla Claude Code a través de tmux, así que en Windows se ejecuta dentro de WSL2, donde Claude Code también funciona mejor. En PowerShell:

```powershell
irm https://remoteharness.app/install | iex
```

El script comprueba Windows 10 2004+ o Windows 11, instala WSL2 con Ubuntu cuando falta (Windows pide permiso de administrador; reinicia si lo pide y vuelve a ejecutar el mismo comando), ayuda a crear el usuario de Linux y ejecuta el instalador de Linux dentro de la distribución. Node y Claude Code deben estar instalados dentro de WSL, no solo en Windows. Opciones: `& ([scriptblock]::Create((irm https://remoteharness.app/install))) -Distro Ubuntu-24.04 -Ref main -Yes -NoService`.

systemd, el inicio al iniciar sesión y Tailscale dentro de WSL están en [Resolución de problemas](/es/docs/troubleshooting/#windows-wsl2).

### Desde un clon

```bash
git clone https://github.com/maarkN/remote-harness.git
cd remote-harness
pnpm install
pnpm --filter @remote-harness/daemon build
node apps/daemon/dist/cli.js setup
```

## Instalar la app

- **iPhone y iPad**: por ahora un development build (TestFlight está en camino). Con Xcode en un Mac, `cd apps/mobile && pnpm ios` la ejecuta en el simulador o en un dispositivo conectado; `make install-ios` hace un release build en un iPhone o iPad conectado. El [CONTRIBUTING.md](https://github.com/maarkN/remote-harness/blob/main/CONTRIBUTING.md#building-and-releasing) tiene los detalles de firma.
- **Android**: el APK de los [Releases de GitHub](https://github.com/maarkN/remote-harness/releases) (permite instalar desde el navegador cuando lo pida), o `pnpm android` y `pnpm build:android` desde el repositorio.

Instala Tailscale también en el móvil y entra en la misma tailnet que el ordenador.

## Emparejar el móvil

La instalación termina con un código QR; `remote-harness pair` lo vuelve a mostrar cuando quieras. Abre la app, escanéalo y listo: la app guarda el token en el almacenamiento seguro del móvil y se conecta por Tailscale.

¿Instalaste primero la app? Su pantalla de emparejamiento tiene una guía paso a paso para el lado del ordenador, con el comando de instalación para compartir.

Probando en un simulador sin Tailscale: `remote-harness start --dev` ata el daemon a `127.0.0.1` y `remote-harness pair --dev` imprime un código compatible. En el emulador de Android ejecuta también `adb reverse tcp:7337 tcp:7337`.

## Primera sesión

Ejecuta tu alias en vez de `claude`, con los mismos argumentos:

```bash
personal            # abre Claude Code en tmux con esa cuenta
trabajo --resume    # otra cuenta
```

Ambas aparecen en la app, totalmente controlables. Las sesiones abiertas con `claude` a secas fuera de tmux también aparecen, en solo lectura, y se pueden reanudar desde el móvil.

## Actualizar

`remote-harness update` descarga la nueva versión, recompila, actualiza los hooks y reinicia el servicio sin las preguntas de la instalación. El servicio en segundo plano también busca actualizaciones cada 6 horas y muestra una notificación de escritorio; consulta [actualizaciones y canales](/es/docs/daemon/#actualizaciones-y-canales).
