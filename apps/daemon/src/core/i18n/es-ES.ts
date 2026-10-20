import type { Messages } from './en-US.ts'

export const esES = {
  cli: {
    description: 'Daemon de Remote Harness: sigue y dirige tus agentes de código desde el móvil',
    help: 'muestra la ayuda del comando',
    version: 'muestra la versión',
    buildMissing: 'No se encontró el build: ejecuta `pnpm --filter @remote-harness/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Sistema no compatible (${platform}). Remote Harness funciona en ${supported}.`,
    start: {
      description: 'inicia el daemon',
      dev: 'escucha en 127.0.0.1 en lugar de Tailscale',
      host: 'dirección de escucha del WebSocket',
      waitTailscale:
        'espera a la interfaz de Tailscale en lugar de fallar (lo usa el servicio en segundo plano)',
    },
    pair: {
      description: 'muestra el código QR de emparejamiento (dirección + token)',
      dev: 'usa 127.0.0.1',
      host: 'dirección que se anuncia en el QR',
      tailscaleNotFound:
        'No se encontró Tailscale (ninguna interfaz 100.x). Instala y conecta Tailscale, o usa --dev para 127.0.0.1.',
      simulatorHint: (port: number) =>
        'Para probar en local (por ejemplo, en el simulador de iOS): `remote-harness start --dev` y `remote-harness pair --dev`' +
        ` (emulador de Android: también \`adb reverse tcp:${port} tcp:${port}\`).`,
      scan: 'Escanéalo con la app Remote Harness. No compartas este código.',
    },
    setup: {
      description: 'asistente: elige cuentas y alias, instala los hooks y el servicio, y empareja el móvil',
      yes: 'sin preguntas: mantiene la configuración o usa las cuentas encontradas',
      noService: 'no instala el servicio en segundo plano',
      lang: (codes: string) => `idioma (${codes}); omite la pregunta`,
      invalidLang: (value: string, codes: string) => `Idioma desconocido "${value}". Usa uno de: ${codes}.`,
      interrupted:
        'Instalación interrumpida. Lo que ya se mostró con ✓ quedó hecho; ejecuta `remote-harness setup` de nuevo cuando quieras.',
    },
    rotateToken: {
      description: 'genera un token nuevo y cierra las conexiones existentes',
      rotated: 'Token cambiado; conexiones cerradas.',
      rotatedOffline: 'Token cambiado (el daemon no está en ejecución).',
      pairAgain: 'Ejecuta `remote-harness pair` para volver a emparejar.',
    },
    provider: {
      description: 'proveedores de modelos de los perfiles (clave de OpenRouter)',
      key: 'guarda la clave del proveedor de un perfil en el almacén seguro del sistema (nunca en un archivo nuestro)',
      stdin: 'lee la clave de la entrada estándar en vez de preguntar',
      prompt: (provider: string) => `Clave de API de ${provider}:`,
      unknownProfile: (id: string) => `No hay ningún perfil "${id}" en la configuración.`,
      noProvider: (id: string) =>
        `El perfil "${id}" no tiene proveedor. Añádele "provider": { "kind": "openrouter" } en config.json primero.`,
      empty: 'No se indicó ninguna clave; no se guardó nada.',
      saved: (id: string, store: string) =>
        `Clave del perfil ${id} guardada ${store}. Las sesiones nuevas del perfil la usan.`,
    },
    keepAwake: {
      description: 'muestra o define cuándo el ordenador se mantiene despierto: off, sessions o always',
      modes: {
        off: 'desactivado',
        sessions: 'mientras hay sesiones activas (y 10 min después)',
        always: 'siempre, mientras el daemon funciona',
      },
      current: (mode: string) => `mantener despierto: ${mode}`,
      holding: 'manteniendo el ordenador despierto ahora',
      notHolding: 'sin mantenerlo ahora',
      unavailable: (reason: string) => `el auxiliar de energía no está disponible: ${reason}`,
      invalid: (value: string, valid: string) => `"${value}" no es un modo; usa uno de: ${valid}`,
      applied: 'aplicado al daemon en ejecución',
      notRunning: 'el daemon no está en ejecución; se aplica en el próximo inicio',
    },
    doctor: {
      description: 'comprueba las dependencias y la configuración',
      notOnPath: 'no se encuentra en el PATH',
      tailscaleMissing: 'no se encontró la interfaz 100.x',
      profile: (id: string, configDir: string) => `perfil ${id} (${configDir})`,
      dirMissing: 'el directorio no existe',
      daemonRunning: 'daemon en ejecución',
      runStart: 'ejecuta `remote-harness start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'en el Llavero de macOS',
        secretTool: 'en el Secret Service (secret-tool)',
        file: (path: string) => `en el archivo ${path} (0600)`,
      },
      runPair: 'ejecuta `remote-harness pair`',
      providerKey: (id: string, provider: string) => `clave de ${provider} del perfil ${id}`,
      runProviderKey: (id: string) => `ejecuta \`remote-harness provider key ${id}\``,
      codexHooks: (id: string, path: string) => `hooks de Codex del perfil ${id} (${path})`,
      codexAccountWithoutProfile: (dir: string) =>
        `Cuenta de Codex encontrada en ${dir} sin un perfil. Ejecuta \`remote-harness setup\` para añadirla.`,
      runInstall: 'ejecuta `remote-harness install`',
      service: (name: string, detail: string) => `servicio en segundo plano ${name} (${detail})`,
      serviceHint: 'opcional: `remote-harness service install`',
      launcherNative: 'las solicitudes de acceso a carpetas muestran "Remote Harness"',
      launcherScript: 'las solicitudes de acceso a carpetas muestran "node" (sin launcher compilado)',
      launcherHint:
        'instala las Command Line Tools (`xcode-select --install`) y ejecuta `remote-harness service install`',
      fullDiskAccess: 'Acceso total al disco',
      fullDiskAccessHint:
        'para no recibir una solicitud por carpeta, añade "Remote Harness" en Ajustes del Sistema → Privacidad y seguridad → Acceso total al disco',
      accessibility: 'Accesibilidad / Automatización',
      accessibilityHint:
        'permite "Remote Harness" en Ajustes del Sistema → Privacidad y seguridad → Automatización',
      keychain: 'Acceso al llavero',
      keychainHint: 'el almacén de tokens no pudo volver a leer el token que acaba de escribir',
      linger: 'lingering (el servicio sigue en marcha tras cerrar sesión)',
      lingerHint: 'ejecuta `loginctl enable-linger $USER`',
      keepAwake: (mode: string, state: string) => `mantener despierto: ${mode} (${state})`,
      keepAwakeHeld: 'activo ahora',
      keepAwakeIdle: 'no hace falta ahora',
      keepAwakeFailed: (reason: string) => `el auxiliar de energía falló: ${reason}`,
      lidNote: 'en un portátil, cerrar la tapa sigue suspendiendo, salvo enchufado y con monitor externo',
      devices: (platforms: string) => `móviles registrados para push: ${platforms}`,
      noDevices: 'ningún móvil registrado para push',
      noDevicesHint: 'abre la app y permite las notificaciones',
      pushMode: (mode: string) => `push: ${mode}`,
      noRelayGrant:
        'ningún móvil tiene grant del relay: usa una build de la app con el push relay o guarda una cuenta de servicio de Firebase',
    },
    install: {
      description:
        'instala los launchers, el PATH en ~/.zshrc / ~/.bashrc y los hooks de los perfiles configurados (sin preguntas)',
      openTerminal: (rc: string) =>
        `Abre un terminal nuevo (o \`source ${rc}\`) y usa los launchers en lugar de \`claude\`.`,
    },
    uninstall: {
      description: 'elimina los launchers, el bloque del PATH en ~/.zshrc / ~/.bashrc y los hooks instalados',
      shellRemoved: (files: string) => `bloque del PATH eliminado de ${files}`,
      hooksRemoved: (path: string) => `hooks eliminados de ${path}`,
    },
    service: {
      description: 'daemon como servicio en segundo plano (launchd en macOS, systemd en Linux)',
      install:
        'instala e inicia el servicio en segundo plano (arranca al iniciar sesión y se reinicia si falla)',
      loaded: (path: string) => `servicio instalado: ${path}`,
      app: (path: string) => `app: ${path}`,
      tailscaleWaiting: '⚠ No se encontró Tailscale: el daemon espera a la interfaz 100.x',
      logs: (path: string) => `logs en ${path}`,
      uninstall: 'detiene y elimina el servicio en segundo plano',
      removed: 'servicio eliminado',
      status: 'muestra si el servicio está cargado',
      notLoaded: 'no cargado',
      unavailable:
        'Los servicios de usuario de systemd no están disponibles aquí (`systemctl --user` ha fallado). Ejecuta `remote-harness start` cuando quieras usarlo (por ejemplo, en una ventana de tmux).',
      lingerHint:
        'Lingering desactivado: el servicio se detiene al cerrar la sesión. Para mantenerlo activo y arrancarlo al iniciar el sistema: `loginctl enable-linger $USER`',
      linger: (enabled: boolean) =>
        enabled
          ? 'lingering activado (sigue en marcha tras cerrar sesión, arranca al iniciar el sistema)'
          : 'lingering desactivado (se detiene al cerrar sesión)',
    },
    update: {
      description:
        'actualiza a la última versión: compila, actualiza los hooks y reinicia el servicio (sin preguntas)',
      ref: 'rama o tag que se instala (por defecto: el canal de actualización)',
      older: (from: string, to: string) =>
        `Esto instala una versión más antigua (${from} → ${to}) porque cambió el canal de actualización.`,
      force: 'vuelve a compilar aunque ya esté actualizado',
      checking: (ref: string) => `Buscando una versión nueva en ${ref}`,
      notInstaller: (dir: string) =>
        `Esta no es la copia del instalador (${dir}). En un clon de desarrollo usa \`git pull\` y \`pnpm --filter @remote-harness/daemon build\`.`,
      dirty: (dir: string) => `${dir} tiene cambios locales. Haz commit o descártalos y vuelve a ejecutarlo.`,
      fetchFailed: (error: string) => `No pude descargar la versión nueva: ${error}`,
      checkoutFailed: 'No pude cambiar a la versión nueva.',
      rolledBack: (version: string) =>
        `Volví a la ${version} y la recompilé: el ordenador queda como estaba.`,
      rollBackFailed: 'No pude volver a la versión anterior: ejecuta `remote-harness update` de nuevo.',
      upToDate: (version: string, commit: string) => `Ya está actualizado (${version}, ${commit}).`,
      available: (version: string, commit: string) => `Versión nueva: ${version} (${commit})`,
      failed:
        'La actualización falló (ver arriba). La versión anterior sigue funcionando hasta el próximo reinicio.',
      serviceRestarted: 'servicio en segundo plano reiniciado',
      serviceNotInstalled:
        'servicio en segundo plano no instalado (opcional: `remote-harness service install`)',
      updated: (from: string, to: string) => `Remote Harness actualizado: ${from} → ${to}`,
      rebuilt: (version: string) => `Remote Harness ${version} compilado de nuevo`,
    },
    updates: {
      description: 'canal de actualización, actualizaciones automáticas y la comprobación en segundo plano',
      status: 'muestra la versión, el canal y la última comprobación',
      check: 'busca una nueva versión ahora',
      channel: 'muestra o cambia el canal: main (estable) o development',
      auto: 'activa o desactiva las actualizaciones automáticas',
      current: (version: string, channel: string) => `Remote Harness ${version} · canal ${channel}`,
      autoState: (on: boolean): string =>
        on ? 'actualizaciones automáticas activadas' : 'actualizaciones automáticas desactivadas',
      lastCheck: (when: string) => `última comprobación: ${when}`,
      neverChecked: 'aún sin comprobar',
      available: (version: string) => `nueva versión disponible: ${version}`,
      older: (version: string) =>
        `el canal tiene una versión más antigua: ${version} (\`remote-harness update\` la instala)`,
      upToDate: 'actualizado',
      channelSet: (channel: string) => `canal: ${channel}`,
      invalidValue: (value: string, list: string) => `Valor desconocido "${value}". Usa uno de: ${list}.`,
      invalidChannel: (value: string, list: string) => `Canal desconocido "${value}". Usa uno de: ${list}.`,
      runUpdate: 'ejecuta `remote-harness update` para cambiar ahora',
      applied: 'aplicado al daemon en ejecución',
      notRunning: 'el daemon no está en ejecución: se aplica en el próximo inicio',
    },
    push: {
      description: 'notificaciones push: estado, activar o desactivar, enviar una prueba',
      status: 'muestra cómo se envían los pushes y a cuántos móviles',
      on: 'envía pushes (cuenta de servicio de Firebase si existe, si no el push relay)',
      off: 'detiene todos los pushes y las actualizaciones del estado en vivo',
      test: 'envía una notificación de prueba a todos los móviles registrados',
      modes: {
        firebase: (path: string) => `Firebase propio (${path})`,
        relay: 'push relay integrado',
        off: 'desactivado (config "push": "off")',
      },
      phones: (count: number) => (count === 1 ? '1 móvil registrado' : `${count} móviles registrados`),
      changed: (mode: string) => `push: ${mode}`,
      applied: 'aplicado al daemon en ejecución',
      notRunning: 'el daemon no está en ejecución: se aplica en el próximo inicio',
      testSent: (count: number) =>
        count === 1 ? 'prueba enviada a 1 móvil' : `prueba enviada a ${count} móviles`,
      testResult: {
        off: 'el push está desactivado (`remote-harness push on`)',
        unregistered: 'ningún móvil registrado: abre la app y permite las notificaciones',
        failed: 'el envío falló: mira los logs del daemon',
      },
    },
    rules: {
      description: 'reglas de "permitir siempre" creadas por la app',
      list: 'lista las reglas creadas por la app',
      empty: 'No hay reglas creadas por la app.',
      undo: 'elimina la regla del archivo en el que se guardó',
      notFound: (id: string) => `No se encontró la regla ${id}.`,
      removed: (rule: string, file: string) => `Regla ${rule} eliminada de ${file}.`,
      alreadyGone: 'La regla ya no estaba en el archivo.',
    },
  },
  install: {
    missingProviderKey: (id: string, provider: string) =>
      `No hay ninguna clave de ${provider} guardada para el perfil ${id}: ejecuta \`remote-harness provider key ${id}\`.`,
    shortcut: (path: string) => `atajo ${path}`,
    shellPath: (files: string) => `PATH en ${files}`,
    hooksIn: (path: string) => `hooks en ${path}`,
    codexTrust:
      'Codex pide una vez confiar en los hooks nuevos: abre `codex` y elige "Trust all and continue" (o revísalos en /hooks). Hasta entonces sus sesiones son de solo lectura.',
    launcherRemoved: (id: string) => `launcher ${id} eliminado`,
    hooksRemovedFrom: (path: string) => `hooks eliminados de ${path}`,
    statusLineIn: (path: string) => `status line en ${path}`,
    statusLineRestored: (path: string) => `status line restaurada en ${path}`,
  },
  setup: {
    languageQuestion: 'Idioma',
    keys: {
      navigate: 'navegar',
      select: 'elegir',
      submit: 'confirmar',
      all: 'todas',
      invert: 'invertir',
    },
    yes: 'sí',
    no: 'no',
    welcome: {
      title: '¡Te damos la bienvenida a Remote Harness!',
      intro1: (machine: string) => `Vamos a preparar este ${machine} para que sigas y controles`,
      intro2: 'tus agentes de código desde el móvil. Tarda unos 2 minutos.',
      footer: (version: string) => `v${version} · ↑/↓ para elegir · Enter para confirmar · Ctrl+C sale`,
    },
    steps: {
      accounts: 'Cuentas de Claude Code',
      installing: 'Instalando launchers, PATH y hooks',
      service: 'Servicio en segundo plano',
      tailscale: 'Tailscale y móvil',
    },
    noAccounts:
      'No se encontró ninguna cuenta de Claude Code. Ejecuta `claude` una vez para iniciar sesión y después `remote-harness setup`.',
    confirmSave: '¿Guardar e instalar?',
    nothingChanged: 'No se ha cambiado nada.',
    serviceQuestion: (machine: string) =>
      `¿Iniciar Remote Harness junto con el ${machine} (y reiniciarlo si falla)?`,
    noService: 'Sin servicio: ejecuta `remote-harness start` cuando quieras usarlo.',
    serviceUnavailable:
      '  Los servicios de usuario de systemd no están disponibles aquí (`systemctl --user`).\n' +
      '  Ejecuta `remote-harness start` cuando quieras usarlo (por ejemplo, en una ventana de tmux o desde tu sistema de init).',
    lingerQuestion:
      '¿Mantener Remote Harness en marcha tras cerrar sesión y arrancarlo al iniciar el sistema? (loginctl enable-linger)',
    lingerEnabled: 'lingering activado (loginctl enable-linger)',
    lingerFailed:
      '  No se pudo activar el lingering. Ejecuta `sudo loginctl enable-linger $USER` para mantener el daemon en marcha tras cerrar sesión.',
    lingerSkipped:
      '  Sin lingering el daemon se detiene al cerrar sesión. Actívalo más tarde con `loginctl enable-linger $USER`.',
    tailscaleIntro: (machine: string, install: string) =>
      `  El ${machine} y el móvil se comunican por una red privada de Tailscale (gratis), desde cualquier lugar.\n` +
      `  1. En el ${machine}: ${install}\n` +
      '  2. En el móvil: instala "Tailscale" (App Store o Google Play) e inicia sesión con la misma cuenta',
    tailscaleInstall: {
      darwin:
        'instálalo desde https://tailscale.com/download/mac (o `brew install --cask tailscale`) e inicia sesión',
      linux: 'instálalo con `curl -fsSL https://tailscale.com/install.sh | sh` y ejecuta `sudo tailscale up`',
    },
    tailscaleQuestion: (machine: string) => `¿Tailscale está conectado en el ${machine}?`,
    tailscaleRetry: 'Ya lo he conectado, comprobar de nuevo',
    tailscaleSkip: 'Hacerlo más tarde',
    tailscaleNotYet: '  Todavía no encuentro la interfaz de Tailscale (100.x).',
    phoneHint: '  En el móvil: instala la app Remote Harness y Tailscale (misma cuenta) y toca "QR code".',
    showQr: '¿Mostrar ahora el código QR de emparejamiento?',
    done: {
      installed: 'Remote Harness instalado.',
      openTerminal: (command: string) => `1. Abre un terminal nuevo (o ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Usa ${aliases} en lugar de ${claude}, con los mismos argumentos`,
      pairIfNeeded: (command: string) => `3. Empareja con ${command} si aún no lo has hecho`,
      connectAndPair: (command: string) => `3. Conecta Tailscale y ejecuta ${command}`,
      footer: 'remote-harness doctor revisa todo · remote-harness setup cambia cuentas',
    },
    accounts: {
      explain:
        '  Cada cuenta de Claude Code vive en una carpeta de configuración (CLAUDE_CONFIG_DIR).\n' +
        '  Para cada una eliges un comando (alias) que la abre en tmux, lista para el móvil.',
      which: '¿Qué cuentas quieres controlar desde el móvil?',
      noneFound: (machine: string) =>
        `  No he encontrado ninguna cuenta de Claude Code en este ${machine}; vamos a crear una.`,
      more: '¿Alguna cuenta más?',
      howToAdd: '¿Cómo quieres añadir la cuenta?',
      noContinue: 'No, continuar',
      create: 'Crear una cuenta nueva',
      createDescription:
        'Crea la carpeta y abre Claude Code en ella para que inicies sesión (p. ej., la cuenta del trabajo)',
      existing: 'Añadir una carpeta que ya existe',
      existingDescription: 'Una carpeta usada antes con CLAUDE_CONFIG_DIR=<carpeta> claude',
      folderPath: 'Ruta de la carpeta (p. ej., ~/.claude-trabajo):',
      folderNotFound:
        'No se encontró la carpeta. Para una cuenta que todavía no existe, elige "Crear una cuenta nueva".',
      alias: 'Comando (alias) para abrir esta cuenta:',
      aliasClash: (alias: string, path: string) =>
        `\`${alias}\` ya existe en ${path}. El launcher tendrá prioridad en el PATH. ¿Usarlo de todos modos?`,
      name: 'Nombre que se muestra en la app:',
      nameRequired: 'Ponle un nombre para reconocer la cuenta en la app.',
    },
    newAccount: {
      folder: 'Carpeta de la nueva cuenta:',
      alreadyLoggedIn: (dir: string, login: string) => `${dir} ya tiene la sesión iniciada (${login})`,
      instructions: (dir: string) =>
        `\n  Voy a abrir Claude Code usando ${dir}. Una vez dentro:\n` +
        '  1. Sigue la configuración inicial e inicia sesión con la cuenta que usará esta carpeta (si no te lo pide, escribe /login)\n' +
        '  2. Después de iniciar sesión, escribe /exit para volver aquí\n',
      pressEnter: 'Pulsa Enter para abrir Claude Code',
      loggedIn: (dir: string, login: string) => `Sesión iniciada en ${dir} (${login})`,
      claudeMissing: '\n  No he podido abrir `claude`. Instala Claude Code: https://claude.com/claude-code',
      noLogin: '\n  No he encontrado ninguna sesión iniciada en esa carpeta.',
      whatNow: '¿Y ahora?',
      retry: 'Abrir Claude Code de nuevo',
      addAnyway: 'Añadirla de todos modos (inicio sesión después con el alias)',
      giveUp: 'Renunciar a esta cuenta',
    },
    provider: {
      add: (provider: string) => `Añadir un perfil de ${provider}`,
      addDescription: (provider: string) =>
        `Claude Code a través de ${provider}, pagado con tu clave de ${provider} (sin iniciar sesión en Anthropic)`,
      title: (provider: string) => `\n  Perfiles a través de ${provider}:`,
      manage: (id: string, provider: string, key: string) => `${id} · vía ${provider} · ${key}`,
      keyStored: 'clave guardada',
      keyMissing: 'sin clave guardada',
      keep: 'Mantenerlo',
      replaceKey: 'Cambiar la clave',
      remove: 'Eliminar el perfil',
      removeDescription: 'Elimina su launcher, sus hooks y la clave guardada; la carpeta se queda',
      folder: 'Carpeta del perfil (su propio CLAUDE_CONFIG_DIR):',
      model: 'Modelo por defecto (opcional, p. ej. anthropic/claude-sonnet-5.5; vacío = el del gateway):',
      key: (provider: string) => `Clave de API de ${provider} (oculta; vacío = guardarla después):`,
      checking: (provider: string) => `Comprobando la clave con ${provider}…`,
      accepted: 'Clave aceptada',
      acceptedCredits: (left: string) => `Clave aceptada · quedan ${left} en créditos`,
      rejected: (provider: string) => `${provider} ha rechazado esta clave.`,
      unchecked: (provider: string, reason: string) =>
        `No he podido comprobar la clave con ${provider} (${reason}); se guardará de todos modos.`,
      whatNow: '¿Y ahora?',
      retry: 'Escribirla de nuevo',
      keepAnyway: 'Guardarla de todos modos',
      skip: 'Saltar (la guardo después)',
      later: (id: string) => `Sin clave por ahora. Después: remote-harness provider key ${id}`,
      keySaved: (id: string, store: string) => `clave de ${id} guardada ${store}`,
      keyRemoved: (id: string) => `clave de ${id} eliminada del almacén de secretos`,
      keyFailed: (id: string, error: string) => `no he podido guardar la clave de ${id}: ${error}`,
      via: (provider: string) => `vía ${provider}`,
    },
  },
  wsl: {
    windowsHint:
      'En Windows, Remote Harness funciona dentro de WSL2. En PowerShell: `irm https://remoteharness.app/install | iex`',
    detected: (distro: string) => `WSL2 (distribución ${distro})`,
    unknownDistro: 'desconocida',
    systemd: 'systemd en ejecución en WSL',
    systemdHint: 'ejecuta `remote-harness setup` para activarlo ([boot] systemd=true en /etc/wsl.conf)',
    systemdPendingHint:
      'ya activado en /etc/wsl.conf: ejecuta `wsl --shutdown` en PowerShell de Windows y vuelve a abrir la distribución',
    networking: (mode: string) => `red de WSL: ${mode}`,
    networkingUnknown: 'desconocida (no se encontró %UserProfile%\\.wslconfig)',
    tailscaleHint:
      'ejecuta Tailscale dentro de WSL o usa la red reflejada con Tailscale en Windows (`remote-harness setup` explica ambas)',
    source: {
      wsl: 'dentro de WSL',
      mirrored: 'Windows, red reflejada',
      unknown: 'WSL',
    },
    logonTask: 'tarea de inicio de sesión de Windows "Remote Harness" (inicia WSL al iniciar sesión)',
    logonTaskHint: 'opcional: `remote-harness setup` la crea',
    logonTaskMissing:
      'sin tarea de inicio de sesión en Windows: WSL (y el daemon) solo arrancan cuando abres la distribución',
    logonTaskRemoved: 'tarea de inicio de sesión de Windows "Remote Harness" eliminada',
    serviceNoSystemd:
      'systemd no se está ejecutando en esta distribución de WSL, así que no hay servicio en segundo plano. Ejecuta `remote-harness setup` para activarlo ([boot] systemd=true en /etc/wsl.conf) y luego `wsl --shutdown` en PowerShell de Windows.',
    restart:
      '  Para que surta efecto, ejecuta `wsl --shutdown` en PowerShell de Windows, vuelve a abrir la distribución y ejecuta `remote-harness setup`.',
    systemdIntro:
      '  Dentro de WSL el servicio en segundo plano necesita systemd, que está desactivado en esta distribución.\n' +
      '  Se activa con [boot] systemd=true en /etc/wsl.conf (un archivo de root, con copia de seguridad antes) con:',
    systemdCommand: (command: string) => `    ${command}`,
    systemdQuestion: '¿Activar systemd en WSL ahora? (sudo puede pedirte la contraseña de Linux)',
    systemdEnabled: 'systemd activado en /etc/wsl.conf',
    systemdFailed: (error: string) =>
      `  No se pudo modificar /etc/wsl.conf (${error}). Añade estas líneas con \`sudo nano /etc/wsl.conf\`:\n    [boot]\n    systemd=true`,
    systemdSkipped:
      '  Sin systemd no hay servicio en segundo plano: ejecuta `remote-harness start` cuando quieras usarlo.',
    systemdPending:
      '  systemd ya está activado en /etc/wsl.conf, pero WSL no se ha reiniciado desde entonces.',
    logonTaskQuestion:
      '¿Iniciar WSL al iniciar sesión en Windows, para que el daemon funcione sin abrir una terminal? (Tarea programada "Remote Harness")',
    logonTaskCreated: 'tarea de inicio de sesión de Windows "Remote Harness"',
    logonTaskFailed: (error: string, command: string) =>
      `  No se pudo crear la tarea (${error}). En PowerShell (como administrador si se deniega el acceso):\n    ${command}`,
    logonTaskSkipped:
      '  Sin la tarea de inicio de sesión, WSL y el daemon arrancan cuando abres la distribución. Créala más tarde con `remote-harness setup`.',
    tailscaleIntro:
      '  El ordenador y el móvil se comunican por una red privada de Tailscale (gratuita). Dentro de WSL hay dos formas:\n' +
      '  A. Tailscale dentro de WSL (cualquier Windows): `curl -fsSL https://tailscale.com/install.sh | sh` y `sudo tailscale up`\n' +
      '  B. Tailscale en Windows + red reflejada de WSL (Windows 11 22H2+): networkingMode=mirrored en .wslconfig\n' +
      '  En el móvil: instala "Tailscale" (App Store o Google Play) e inicia sesión con la misma cuenta',
    tailscaleMirrored: 'Tailscale funciona en Windows: activar la red reflejada (.wslconfig)',
    mirroredEnabled: (path: string) => `networkingMode=mirrored en ${path}`,
    mirroredAlready: (path: string) => `networkingMode=mirrored ya estaba en ${path}`,
    mirroredNoConfig:
      '  No se encontró %UserProfile%\\.wslconfig (¿la interoperabilidad con Windows está desactivada?). Añade [wsl2] networkingMode=mirrored a mano.',
  },
  power: {
    why: 'Hay sesiones de Remote Harness en ejecución',
  },
  bundle: {
    folderAccess:
      'Remote Harness ejecuta las sesiones de tu agente de código en esta carpeta y necesita leer y escribir sus archivos.',
  },
  machine: { darwin: 'Mac', linux: 'ordenador' },
  profiles: {
    defaultName: 'Personal',
    newDirName: (index: number) => (index === 0 ? 'trabajo' : index === 1 ? 'personal' : `cuenta-${index}`),
    newDirFallback: 'nueva',
    claudeAccount: 'cuenta de Claude',
    apiKey: 'clave de API',
    aliasFormat: 'Usa minúsculas, números, - o _, empezando por una letra (hasta 32).',
    aliasReserved: (alias: string) => `"${alias}" está reservado: el launcher llama al propio \`${alias}\`.`,
    aliasTaken: (alias: string) => `"${alias}" ya lo usa otro perfil.`,
    dirAbsolute: 'Usa una ruta absoluta o que empiece por ~/.',
    dirOtherTool: (dir: string) => `${dir} es de otra herramienta; elige otro nombre.`,
    dirInList: 'Esa carpeta ya está en la lista de cuentas.',
    dirIsFile: 'Ya existe un archivo con ese nombre.',
  },
  /** Sent back to Claude Code (shown in its TUI). */
  claudeCode: {
    denied: 'Denegado por Remote Harness',
    keepPlanning:
      'El usuario quiere seguir planificando. Revisa el plan antes de volver a llamar a ExitPlanMode.',
  },
  live: {
    states: { working: 'Trabajando', waiting: 'Esperándote', done: 'Terminada', closed: 'Sesión cerrada' },
    steps: {
      thinking: 'pensando',
      writing: 'escribiendo la respuesta',
      command: 'ejecutando un comando',
      editing: 'editando archivos',
      reading: 'leyendo archivos',
      searching: 'buscando en el código',
      web: 'navegando por la web',
      agent: 'ejecutando un subagente',
      planning: 'actualizando el plan',
      tool: 'usando una herramienta',
      permission: 'permiso pendiente',
    },
    tools: (count: number) => (count === 1 ? '1 herramienta' : `${count} herramientas`),
    tasks: (count: number) => (count === 1 ? '1 tarea en curso' : `${count} tareas en curso`),
    ago: 'hace {time}',
    allow: 'Permitir',
    deny: 'Denegar',
    total: 'total',
    closedHint: 'transcripción guardada · reanuda desde la app',
  },
  updates: {
    available: (version: string) => `Remote Harness ${version} disponible`,
    availableBody: 'Actualiza desde el icono de la barra de menús o ejecuta `remote-harness update`.',
    older: (version: string) => `Remote Harness ${version} de este canal es más antiguo`,
    olderBody:
      'Elige "Instalar" en el icono de la barra de menús o ejecuta `remote-harness update` para cambiar.',
    updating: (version: string) => `Actualizando Remote Harness a ${version}…`,
    tray: {
      tooltip: (version: string) => `Remote Harness ${version}`,
      running: (version: string) => `En ejecución · ${version}`,
      updateAvailable: (version: string) => `Actualización disponible: ${version}`,
      updating: 'Actualizando…',
      check: 'Buscar actualizaciones',
      checking: 'Buscando…',
      updateNow: (version: string) => `Actualizar ahora (${version})`,
      installOlder: (version: string) => `Instalar ${version} (más antigua)`,
      auto: 'Actualizaciones automáticas',
      channel: 'Canal',
      channels: { main: 'main (estable)', development: 'development' },
      logs: 'Abrir logs',
      restart: 'Reiniciar daemon',
      doctor: 'Ejecutar doctor',
      quit: 'Cerrar icono',
      status: (machine: string, version: string, since: string) => `${machine} · ${version} · desde ${since}`,
      waiting: 'Esperando por ti',
      allow: 'Permitir',
      always: 'Permitir siempre',
      deny: 'Denegar',
      focus: 'Abrir en la terminal (tmux)',
      rename: 'Renombrar…',
      close: 'Cerrar sesión',
      seeAllSessions: 'Ver todas las sesiones…',
      sessionsWindowTitle: 'Sesiones',
      searchSessions: 'Buscar sesiones',
      copyPath: 'Copiar ruta',
      renamePromptTitle: 'Renombrar sesión',
      renameConfirm: 'Renombrar',
      cancel: 'Cancelar',
      prefsWindowTitle: 'Preferencias de Remote Harness',
      tabGeneral: 'General',
      tabUpdates: 'Actualizaciones',
      tabNotifications: 'Notificaciones',
      tabProfiles: 'Perfiles',
      tabPairing: 'Emparejamiento',
      tabAdvanced: 'Avanzado',
      prefMachineName: 'Nombre de la máquina',
      prefShowInMenuBar: 'Mostrar en la barra de menús',
      prefStartAtLogin: 'Abrir al iniciar sesión',
      prefPushHint: 'Incluye las notificaciones y el estado en vivo en el teléfono',
      muteRulesHint: 'Las sesiones silenciadas se gestionan desde la app',
      updatesUnavailable: 'Las actualizaciones están desactivadas en esta versión',
      sessions: (total: number, running: number) =>
        running > 0 ? `Sesiones · ${total} · ${running} en marcha` : `Sesiones · ${total}`,
      noSessions: 'Sin sesiones',
      ended: (count: number) => (count === 1 ? '1 sesión terminada' : `${count} sesiones terminadas`),
      states: { running: 'en marcha', waiting: 'esperando', idle: 'inactiva', ended: 'terminada' },
      worktree: 'worktree',
      phones: (count: number, push: boolean) => `Teléfonos · ${count}${push ? ' · push ✓' : ''}`,
      newSession: 'Nueva sesión…',
      pair: 'Vincular un teléfono…',
      docs: 'Abrir la documentación',
      prefs: 'Preferencias…',
      pairMenu: 'Emparejar un móvil',
      pairInTerminal: 'Mostrar el emparejamiento en la terminal',
      rotateToken: 'Cambiar el token…',
      rotateConfirm: 'Cambiar y desconectar los móviles emparejados',
      prefsMenu: 'Preferencias',
      prefPermissions: 'Mostrar aquí las solicitudes de permiso',
      keepAwake: 'Mantener el ordenador despierto',
      keepAwakeModes: { off: 'Nunca', sessions: 'Mientras haya sesiones activas', always: 'Siempre' },
      prefPush: 'Notificaciones push',
      openConfig: 'Abrir el archivo de configuración…',
      quitMenu: 'Salir',
      hideIcon: 'Ocultar el icono (el servicio sigue funcionando)',
      stopService: 'Detener el servicio hasta el próximo inicio de sesión',
    },
  },
  push: {
    sessionDone: 'Sesión terminada',
    sessionWorking: 'Sesión trabajando',
    sessionWaiting: 'Sesión esperándote',
    permissionPending: 'Permiso pendiente',
    questionPending: 'El agente está esperando tu respuesta',
    planPending: 'Plan listo para revisar',
    questionReminder: 'Todavía esperando tu respuesta',
    planReminder: 'El plan todavía espera tu revisión',
    testTitle: 'Notificación de prueba',
    testBody: (host: string) => `Las notificaciones de ${host} funcionan`,
  },
} satisfies Messages
