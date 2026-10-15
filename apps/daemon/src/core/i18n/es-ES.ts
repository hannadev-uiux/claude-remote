import type { Messages } from './en-US.ts'

export const esES = {
  cli: {
    description: 'Daemon de Claude Remote: controla las sesiones de Claude Code en tmux desde el móvil',
    help: 'muestra la ayuda del comando',
    version: 'muestra la versión',
    buildMissing: 'No se encontró el build: ejecuta `pnpm --filter @claude-remote/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Sistema no compatible (${platform}). Claude Remote funciona en ${supported}.`,
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
      simulatorHint:
        'Para probar en el simulador de este Mac: `claude-remote start --dev` y `claude-remote pair --dev`.',
      scan: 'Escanéalo con la app Claude Remote. No compartas este código.',
    },
    setup: {
      description: 'asistente: elige cuentas y alias, instala los hooks y el servicio, y empareja el iPhone',
      yes: 'sin preguntas: mantiene la configuración o usa las cuentas encontradas',
      noService: 'no instala el servicio en segundo plano',
      lang: (codes: string) => `idioma (${codes}); omite la pregunta`,
      invalidLang: (value: string, codes: string) => `Idioma desconocido "${value}". Usa uno de: ${codes}.`,
      interrupted:
        'Instalación interrumpida. Lo que ya se mostró con ✓ quedó hecho; ejecuta `claude-remote setup` de nuevo cuando quieras.',
    },
    rotateToken: {
      description: 'genera un token nuevo y cierra las conexiones existentes',
      rotated: 'Token cambiado; conexiones cerradas.',
      rotatedOffline: 'Token cambiado (el daemon no está en ejecución).',
      pairAgain: 'Ejecuta `claude-remote pair` para volver a emparejar.',
    },
    doctor: {
      description: 'comprueba las dependencias y la configuración',
      notOnPath: 'no se encuentra en el PATH',
      tailscaleMissing: 'no se encontró la interfaz 100.x',
      profile: (id: string, configDir: string) => `perfil ${id} (${configDir})`,
      dirMissing: 'el directorio no existe',
      daemonRunning: 'daemon en ejecución',
      runStart: 'ejecuta `claude-remote start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'en el Llavero de macOS',
        secretTool: 'en el Secret Service (secret-tool)',
        file: (path: string) => `en el archivo ${path} (0600)`,
      },
      runPair: 'ejecuta `claude-remote pair`',
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
        'Los servicios de usuario de systemd no están disponibles aquí (`systemctl --user` ha fallado). Ejecuta `claude-remote start` cuando quieras usarlo (por ejemplo, en una ventana de tmux).',
      lingerHint:
        'Lingering desactivado: el servicio se detiene al cerrar la sesión. Para mantenerlo activo y arrancarlo al iniciar el sistema: `loginctl enable-linger $USER`',
      linger: (enabled: boolean) =>
        enabled
          ? 'lingering activado (sigue en marcha tras cerrar sesión, arranca al iniciar el sistema)'
          : 'lingering desactivado (se detiene al cerrar sesión)',
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
    shortcut: (path: string) => `atajo ${path}`,
    shellPath: (files: string) => `PATH en ${files}`,
    hooksIn: (path: string) => `hooks en ${path}`,
    launcherRemoved: (id: string) => `launcher ${id} eliminado`,
    hooksRemovedFrom: (path: string) => `hooks eliminados de ${path}`,
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
      title: '¡Te damos la bienvenida a Claude Remote!',
      intro1: 'Vamos a preparar este Mac para que sigas y controles',
      intro2: 'Claude Code desde el iPhone. Tarda unos 2 minutos.',
      footer: (version: string) => `v${version} · ↑/↓ para elegir · Enter para confirmar · Ctrl+C sale`,
    },
    steps: {
      accounts: 'Cuentas de Claude Code',
      installing: 'Instalando launchers, PATH y hooks',
      service: 'Servicio en segundo plano',
      tailscale: 'Tailscale e iPhone',
    },
    noAccounts:
      'No se encontró ninguna cuenta de Claude Code. Ejecuta `claude` una vez para iniciar sesión y después `claude-remote setup`.',
    confirmSave: '¿Guardar e instalar?',
    nothingChanged: 'No se ha cambiado nada.',
    serviceQuestion: '¿Iniciar Claude Remote junto con el Mac (y reiniciarlo si falla)?',
    noService: 'Sin servicio: ejecuta `claude-remote start` cuando quieras usarlo.',
    serviceUnavailable:
      '  Los servicios de usuario de systemd no están disponibles aquí (`systemctl --user`).\n' +
      '  Ejecuta `claude-remote start` cuando quieras usarlo (por ejemplo, en una ventana de tmux o desde tu sistema de init).',
    lingerQuestion:
      '¿Mantener Claude Remote en marcha tras cerrar sesión y arrancarlo al iniciar el sistema? (loginctl enable-linger)',
    lingerEnabled: 'lingering activado (loginctl enable-linger)',
    lingerFailed:
      '  No se pudo activar el lingering. Ejecuta `sudo loginctl enable-linger $USER` para mantener el daemon en marcha tras cerrar sesión.',
    lingerSkipped:
      '  Sin lingering el daemon se detiene al cerrar sesión. Actívalo más tarde con `loginctl enable-linger $USER`.',
    tailscaleIntro:
      '  El Mac y el iPhone se comunican por una red privada de Tailscale (gratis), desde cualquier lugar.\n' +
      '  1. En el Mac: instálalo desde https://tailscale.com/download/mac (o `brew install --cask tailscale`) e inicia sesión\n' +
      '  2. En el iPhone: instala "Tailscale" desde el App Store e inicia sesión con la misma cuenta',
    tailscaleQuestion: '¿Tailscale está conectado en el Mac?',
    tailscaleRetry: 'Ya lo he conectado, comprobar de nuevo',
    tailscaleSkip: 'Hacerlo más tarde',
    tailscaleNotYet: '  Todavía no encuentro la interfaz de Tailscale (100.x).',
    iphoneHint: '  En el iPhone: instala la app Claude Remote y Tailscale (misma cuenta) y toca "QR code".',
    showQr: '¿Mostrar ahora el código QR de emparejamiento?',
    done: {
      installed: 'Claude Remote instalado.',
      openTerminal: (command: string) => `1. Abre un terminal nuevo (o ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Usa ${aliases} en lugar de ${claude}, con los mismos argumentos`,
      pairIfNeeded: (command: string) => `3. Empareja con ${command} si aún no lo has hecho`,
      connectAndPair: (command: string) => `3. Conecta Tailscale y ejecuta ${command}`,
      footer: 'claude-remote doctor lo revisa todo · claude-remote setup cambia cuentas',
    },
    accounts: {
      explain:
        '  Cada cuenta de Claude Code vive en una carpeta de configuración (CLAUDE_CONFIG_DIR).\n' +
        '  Para cada una eliges un comando (alias) que la abre en tmux, lista para el móvil.',
      which: '¿Qué cuentas quieres controlar desde el iPhone?',
      noneFound: '  No he encontrado ninguna cuenta de Claude Code en este Mac; vamos a crear una.',
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
  },
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
    denied: 'Denegado por Claude Remote',
  },
  push: {
    sessionDone: 'Sesión terminada',
    sessionWaiting: 'Sesión esperándote',
    permissionPending: 'Permiso pendiente',
  },
} satisfies Messages
