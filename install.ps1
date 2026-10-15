# Claude Remote installer for Windows (WSL2).
#
#   irm https://maarkn.dev/claude-remote/install.ps1 | iex
#   & ([scriptblock]::Create((irm https://maarkn.dev/claude-remote/install.ps1))) -Yes -Ref development
#
# Claude Remote drives Claude Code through tmux, so on Windows it runs inside WSL2. This script checks
# Windows 10 2004+ (build 19041) or Windows 11, installs WSL2 with Ubuntu when it is missing (administrator
# prompt, maybe a reboot: run it again afterwards), makes sure the distribution has a Linux user, and then
# runs the Linux one-line installer (install.sh) inside it, which builds the daemon and opens the setup.
#
# Parameters: -Ref <branch|tag> (env CLAUDE_REMOTE_REF), -Yes (no questions), -NoService (no background
# service), -Distro <name> (default: Ubuntu, or the WSL default distribution).
# Everything lives in Install-ClaudeRemote so a partially downloaded script never runs, and nothing calls
# `exit` (under `iex` that would close the user's PowerShell). Messages follow (Get-Culture).Name
# (pt*, es*, else English); the language is passed on to the Linux installer as CLAUDE_REMOTE_LANG.
# The file is UTF-8 without BOM (a BOM would end up inside the `irm | iex` string): accents are right
# under `irm | iex` and in PowerShell 7; a saved copy run by Windows PowerShell 5.1 shows them garbled.

[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseBOMForUnicodeEncodedFile', '')]
param(
  [string]$Ref = '',
  [switch]$Yes,
  [switch]$NoService,
  [string]$Distro = ''
)

function Install-ClaudeRemote {
  # Interactive installer: colored console output is the point (Write-Host). The parameters are used by
  # the nested functions, which the analyzer does not follow.
  [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '')]
  [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', '')]
  [CmdletBinding()]
  param(
    [string]$Ref = '',
    [switch]$Yes,
    [switch]$NoService,
    [string]$Distro = ''
  )

  Set-StrictMode -Version 3.0
  $ErrorActionPreference = 'Stop'
  $PSNativeCommandUseErrorActionPreference = $false

  $InstallShUrl = 'https://maarkn.dev/claude-remote/install.sh'
  $RawUrl = 'https://raw.githubusercontent.com/maarkN/claude-remote/{0}/install.sh'
  $DefaultDistro = 'Ubuntu'
  $MinBuild = 19041

  $messages = @{
    'en-US' = @{
      Installer      = 'installer (Windows)'
      NotWindows     = 'This installer is for Windows. On macOS and Linux run: curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash'
      OldWindows     = 'Windows 10 version 2004 (build 19041) or later, or Windows 11, is required (found build {0}). Update Windows and run this again.'
      InvalidValue   = 'Invalid value for -{0}: {1}'
      WslMissing     = 'WSL2 is not installed. Claude Remote runs inside WSL2 (Linux on Windows), with Ubuntu.'
      WslAdmin       = 'Installing WSL needs administrator rights: Windows will ask for permission (UAC). It downloads Ubuntu and may need a reboot.'
      AskInstallWsl  = 'Install WSL2 with Ubuntu now?'
      InstallingWsl  = 'Installing WSL2 and Ubuntu (wsl --install -d {0} --no-launch)'
      WslFailed      = 'WSL could not be installed (exit code {0}). Corporate machines may block WSL or virtualization: check with your IT team. Help: https://aka.ms/wslinstall'
      WslInstalled   = 'WSL is installed. Restart Windows if it asks you to, then run the same command again to continue:'
      Cancelled      = 'Nothing was changed.'
      NoDistro       = 'The WSL distribution {0} has not been set up yet: it will open so you create your Linux user (name and password).'
      CreateUserExit = 'When the Linux prompt appears, type exit to come back here.'
      AskOpenDistro  = 'Open {0} now to create your Linux user?'
      DistroMissing  = 'WSL distribution {0} not found. Installed: {1}. Choose one with -Distro <name>.'
      None           = 'none'
      Wsl1           = '{0} runs on WSL 1, and Claude Remote needs WSL 2. Convert it with: wsl --set-version {0} 2'
      RootUser       = '{0} logs in as root: it has no Linux user yet.'
      AskCreateUser  = 'Create a Linux user in {0} now (recommended)?'
      UserName       = 'Linux user name (lowercase, e.g. {0})'
      UserNameBad    = 'Use lowercase letters, digits, - or _, starting with a letter.'
      UserPassword   = 'Linux will now ask for the password of {0} (typing does not show).'
      UserFailed     = 'Could not create the user (exit code {0}).'
      UserCreated    = 'Linux user {0} created and set as the default of {1}.'
      ContinueRoot   = 'Continuing as root.'
      Using          = 'WSL distribution: {0}'
      RunningLinux   = 'Running the Linux installer inside {0}'
      LinuxFailed    = 'The Linux installer stopped (exit code {0}). Fix what it says above and run this command again.'
      Done           = 'Done. Claude Remote lives in {0}: open it (Start menu, or wsl -d {0}) to use your aliases.'
      YesNo          = '[Y/n]'
      YesLetters     = 'y', 'yes'
    }
    'pt-BR' = @{
      Installer      = 'instalador (Windows)'
      NotWindows     = 'Este instalador é para Windows. No macOS e no Linux rode: curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash'
      OldWindows     = 'É preciso o Windows 10 versão 2004 (build 19041) ou mais novo, ou o Windows 11 (encontrado build {0}). Atualize o Windows e rode de novo.'
      InvalidValue   = 'Valor inválido para -{0}: {1}'
      WslMissing     = 'O WSL2 não está instalado. O Claude Remote roda dentro do WSL2 (Linux no Windows), com Ubuntu.'
      WslAdmin       = 'Instalar o WSL exige permissão de administrador: o Windows vai pedir autorização (UAC). Ele baixa o Ubuntu e pode exigir reiniciar.'
      AskInstallWsl  = 'Instalar o WSL2 com Ubuntu agora?'
      InstallingWsl  = 'Instalando o WSL2 e o Ubuntu (wsl --install -d {0} --no-launch)'
      WslFailed      = 'Não deu para instalar o WSL (código {0}). Máquinas corporativas podem bloquear o WSL ou a virtualização: fale com a TI. Ajuda: https://aka.ms/wslinstall'
      WslInstalled   = 'WSL instalado. Reinicie o Windows se ele pedir e rode o mesmo comando de novo para continuar:'
      Cancelled      = 'Nada foi alterado.'
      NoDistro       = 'A distribuição {0} do WSL ainda não foi configurada: ela vai abrir para você criar seu usuário do Linux (nome e senha).'
      CreateUserExit = 'Quando aparecer o prompt do Linux, digite exit para voltar aqui.'
      AskOpenDistro  = 'Abrir o {0} agora para criar seu usuário do Linux?'
      DistroMissing  = 'Distribuição {0} do WSL não encontrada. Instaladas: {1}. Escolha uma com -Distro <nome>.'
      None           = 'nenhuma'
      Wsl1           = 'O {0} roda no WSL 1, e o Claude Remote precisa do WSL 2. Converta com: wsl --set-version {0} 2'
      RootUser       = 'O {0} entra como root: ainda não tem usuário do Linux.'
      AskCreateUser  = 'Criar um usuário do Linux no {0} agora (recomendado)?'
      UserName       = 'Nome do usuário do Linux (minúsculas, ex.: {0})'
      UserNameBad    = 'Use letras minúsculas, números, - ou _, começando com uma letra.'
      UserPassword   = 'O Linux vai pedir agora a senha de {0} (o que você digita não aparece).'
      UserFailed     = 'Não deu para criar o usuário (código {0}).'
      UserCreated    = 'Usuário {0} do Linux criado e definido como padrão do {1}.'
      ContinueRoot   = 'Continuando como root.'
      Using          = 'Distribuição do WSL: {0}'
      RunningLinux   = 'Rodando o instalador do Linux dentro do {0}'
      LinuxFailed    = 'O instalador do Linux parou (código {0}). Corrija o que ele disse acima e rode este comando de novo.'
      Done           = 'Pronto. O Claude Remote fica no {0}: abra-o (menu Iniciar, ou wsl -d {0}) para usar seus aliases.'
      YesNo          = '[S/n]'
      YesLetters     = 's', 'sim', 'y', 'yes'
    }
    'es-ES' = @{
      Installer      = 'instalador (Windows)'
      NotWindows     = 'Este instalador es para Windows. En macOS y Linux ejecuta: curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash'
      OldWindows     = 'Se necesita Windows 10 versión 2004 (build 19041) o posterior, o Windows 11 (encontrado build {0}). Actualiza Windows y vuelve a ejecutarlo.'
      InvalidValue   = 'Valor no válido para -{0}: {1}'
      WslMissing     = 'WSL2 no está instalado. Claude Remote funciona dentro de WSL2 (Linux en Windows), con Ubuntu.'
      WslAdmin       = 'Instalar WSL requiere permisos de administrador: Windows pedirá autorización (UAC). Descarga Ubuntu y puede requerir reiniciar.'
      AskInstallWsl  = '¿Instalar WSL2 con Ubuntu ahora?'
      InstallingWsl  = 'Instalando WSL2 y Ubuntu (wsl --install -d {0} --no-launch)'
      WslFailed      = 'No se pudo instalar WSL (código {0}). Los equipos corporativos pueden bloquear WSL o la virtualización: consulta con tu equipo de TI. Ayuda: https://aka.ms/wslinstall'
      WslInstalled   = 'WSL instalado. Reinicia Windows si te lo pide y vuelve a ejecutar el mismo comando para continuar:'
      Cancelled      = 'No se ha cambiado nada.'
      NoDistro       = 'La distribución {0} de WSL aún no está configurada: se abrirá para que crees tu usuario de Linux (nombre y contraseña).'
      CreateUserExit = 'Cuando aparezca el prompt de Linux, escribe exit para volver aquí.'
      AskOpenDistro  = '¿Abrir {0} ahora para crear tu usuario de Linux?'
      DistroMissing  = 'No se encontró la distribución {0} de WSL. Instaladas: {1}. Elige una con -Distro <nombre>.'
      None           = 'ninguna'
      Wsl1           = '{0} funciona con WSL 1, y Claude Remote necesita WSL 2. Conviértela con: wsl --set-version {0} 2'
      RootUser       = '{0} entra como root: todavía no tiene usuario de Linux.'
      AskCreateUser  = '¿Crear un usuario de Linux en {0} ahora (recomendado)?'
      UserName       = 'Nombre del usuario de Linux (minúsculas, p. ej. {0})'
      UserNameBad    = 'Usa letras minúsculas, números, - o _, empezando por una letra.'
      UserPassword   = 'Linux pedirá ahora la contraseña de {0} (lo que escribas no se muestra).'
      UserFailed     = 'No se pudo crear el usuario (código {0}).'
      UserCreated    = 'Usuario {0} de Linux creado y definido como predeterminado de {1}.'
      ContinueRoot   = 'Continuando como root.'
      Using          = 'Distribución de WSL: {0}'
      RunningLinux   = 'Ejecutando el instalador de Linux dentro de {0}'
      LinuxFailed    = 'El instalador de Linux se detuvo (código {0}). Corrige lo que indica arriba y vuelve a ejecutar este comando.'
      Done           = 'Listo. Claude Remote vive en {0}: ábrela (menú Inicio, o wsl -d {0}) para usar tus alias.'
      YesNo          = '[S/n]'
      YesLetters     = 's', 'si', 'sí', 'y', 'yes'
    }
  }

  $culture = (Get-Culture).Name
  if ($culture -like 'pt*') { $lang = 'pt-BR' }
  elseif ($culture -like 'es*') { $lang = 'es-ES' }
  else { $lang = 'en-US' }
  $T = $messages[$lang]

  function Write-Step([string]$Text) { Write-Host '▸ ' -ForegroundColor DarkYellow -NoNewline; Write-Host $Text }
  function Write-Info([string]$Text) { Write-Host "  $Text" -ForegroundColor DarkGray }
  function Write-Fail([string]$Text) { Write-Host "✗ $Text" -ForegroundColor Red }

  function Confirm-Step([string]$Question) {
    if ($Yes) { return $true }
    $answer = Read-Host "$Question $($T.YesNo)"
    $answer = "$answer".Trim().ToLowerInvariant()
    return ($answer -eq '' -or $T.YesLetters -contains $answer)
  }

  # Runs a native program and captures its output. wsl.exe writes UTF-16 by default: WSL_UTF8=1 asks for
  # UTF-8 and leftover NULs are removed, so both decode to plain text.
  function Invoke-Native([string]$File, [string[]]$Arguments) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $output = & $File @Arguments 2>&1 | ForEach-Object { "$_" }
      $code = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previous
    }
    return [pscustomobject]@{ ExitCode = $code; Output = ((@($output) -join "`n") -replace "`0", '') }
  }

  function Test-WslInstalled {
    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { return $false }
    return (Invoke-Native 'wsl.exe' @('--status')).ExitCode -eq 0
  }

  # Name, default flag and WSL version of each distribution (`wsl --list --verbose`; the header and the
  # state column are localized, so only the name and the trailing version digit are used).
  function Get-WslDistro {
    $result = Invoke-Native 'wsl.exe' @('--list', '--verbose')
    $distros = @()
    if ($result.ExitCode -ne 0) { return $distros }
    foreach ($line in ($result.Output -split "`r?`n")) {
      if ($line -match '^\s*(\*)?\s*(\S+)\s+.*\s(\d)\s*$') {
        if ($Matches[2] -like 'docker-desktop*') { continue }
        $distros += [pscustomobject]@{ Name = $Matches[2]; Default = [bool]$Matches[1]; Version = [int]$Matches[3] }
      }
    }
    return $distros
  }

  function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    return ([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  }

  function Install-Wsl([string]$Name) {
    Write-Step ($T.InstallingWsl -f $Name)
    $arguments = @('--install', '-d', $Name, '--no-launch')
    if (Test-IsAdmin) {
      & wsl.exe @arguments
      return $LASTEXITCODE
    }
    try {
      $process = Start-Process -FilePath 'wsl.exe' -ArgumentList $arguments -Verb RunAs -Wait -PassThru
      return $process.ExitCode
    }
    catch {
      # The UAC prompt was declined.
      return -1
    }
  }

  # A distribution installed with --no-launch logs in as root: create a user, add it to sudo and make it
  # the default in /etc/wsl.conf (backup, temp file and rename; nothing changes when a default exists).
  function Add-LinuxUser([string]$Name) {
    $suggestion = ("$env:USERNAME".ToLowerInvariant() -replace '[^a-z0-9_-]', '')
    if ($suggestion -notmatch '^[a-z]') { $suggestion = 'me' }
    do {
      $user = (Read-Host ($T.UserName -f $suggestion)).Trim()
      if ($user -eq '') { $user = $suggestion }
      $valid = $user -match '^[a-z][a-z0-9_-]{0,31}$'
      if (-not $valid) { Write-Info $T.UserNameBad }
    } while (-not $valid)
    Write-Info ($T.UserPassword -f $user)
    # Windows PowerShell drops empty arguments, so the full name (gecos) is the user name.
    & wsl.exe -d $Name -u root -- adduser --gecos $user $user
    if ($LASTEXITCODE -ne 0) { Write-Fail ($T.UserFailed -f $LASTEXITCODE); return $false }
    $null = Invoke-Native 'wsl.exe' @('-d', $Name, '-u', 'root', '--', 'usermod', '-aG', 'sudo', $user)
    # No double quotes in the script: Windows PowerShell 5.1 does not escape them for native programs.
    $script = 'set -e; f=/etc/wsl.conf; t=$f.claude-remote.tmp; touch $f; ' +
      'if grep -qiE ''^[[:space:]]*default[[:space:]]*='' $f; then exit 0; fi; cp -p $f $f.bak-claude-remote; ' +
      'if grep -qiE ''^\[user\]'' $f; then sed -E ''/^\[user\]/I a default=''$1 $f > $t; ' +
      'else { cat $f; printf ''\n[user]\ndefault=%s\n'' $1; } > $t; fi; chmod 644 $t; mv -f $t $f'
    $result = Invoke-Native 'wsl.exe' @('-d', $Name, '-u', 'root', '--', 'sh', '-c', $script, 'sh', $user)
    if ($result.ExitCode -ne 0) { Write-Fail ($T.UserFailed -f $result.ExitCode); return $false }
    # The default user is read when the distribution starts.
    $null = Invoke-Native 'wsl.exe' @('--terminate', $Name)
    Write-Step ($T.UserCreated -f $user, $Name)
    return $true
  }

  function Invoke-Main {
    Write-Host ''
    Write-Host '✻ ' -ForegroundColor DarkYellow -NoNewline
    Write-Host 'Claude Remote' -NoNewline
    Write-Host " · $($T.Installer)" -ForegroundColor DarkGray
    Write-Host ''

    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { Write-Fail $T.NotWindows; return }
    $build = [Environment]::OSVersion.Version.Build
    if ($build -lt $MinBuild) { Write-Fail ($T.OldWindows -f $build); return }

    if ($Ref -eq '' -and $env:CLAUDE_REMOTE_REF) { $Ref = $env:CLAUDE_REMOTE_REF }
    if ($Ref -ne '' -and $Ref -notmatch '^[A-Za-z0-9._/-]+$') { Write-Fail ($T.InvalidValue -f 'Ref', $Ref); return }
    if ($Distro -ne '' -and $Distro -notmatch '^[A-Za-z0-9._-]+$') { Write-Fail ($T.InvalidValue -f 'Distro', $Distro); return }

    $env:WSL_UTF8 = '1'

    if (-not (Test-WslInstalled)) {
      Write-Step $T.WslMissing
      Write-Info $T.WslAdmin
      if (-not (Confirm-Step $T.AskInstallWsl)) { Write-Info $T.Cancelled; return }
      $name = if ($Distro -ne '') { $Distro } else { $DefaultDistro }
      $code = Install-Wsl $name
      if ($code -ne 0) { Write-Fail ($T.WslFailed -f $code); return }
      Write-Step $T.WslInstalled
      Write-Host '  irm https://maarkn.dev/claude-remote/install.ps1 | iex' -ForegroundColor DarkYellow
      return
    }

    $distros = @(Get-WslDistro)
    if ($Distro -ne '') { $name = $Distro }
    elseif ($distros | Where-Object { $_.Name -eq $DefaultDistro }) { $name = $DefaultDistro }
    elseif ($distros | Where-Object { $_.Default }) { $name = @($distros | Where-Object { $_.Default })[0].Name }
    elseif ($distros.Count -gt 0) { $name = $distros[0].Name }
    else { $name = $DefaultDistro }

    $distro = @($distros | Where-Object { $_.Name -eq $name }) | Select-Object -First 1
    if (-not $distro) {
      if ($Distro -ne '' -and $Distro -notlike 'Ubuntu*') {
        $installed = ($distros | ForEach-Object { $_.Name }) -join ', '
        if ($installed -eq '') { $installed = $T.None }
        Write-Fail ($T.DistroMissing -f $name, $installed)
        return
      }
      # Never launched: `wsl --install -d` installs it if needed and runs its first start (user creation).
      Write-Step ($T.NoDistro -f $name)
      Write-Info $T.CreateUserExit
      if (-not (Confirm-Step ($T.AskOpenDistro -f $name))) { Write-Info $T.Cancelled; return }
      & wsl.exe --install -d $name
      $distro = @(Get-WslDistro | Where-Object { $_.Name -eq $name }) | Select-Object -First 1
      if (-not $distro) { Write-Fail ($T.DistroMissing -f $name, $T.None); return }
    }
    if ($distro.Version -ne 2) { Write-Fail ($T.Wsl1 -f $name); return }
    Write-Step ($T.Using -f $name)

    $uid = (Invoke-Native 'wsl.exe' @('-d', $name, '--', 'id', '-u')).Output.Trim()
    if ($uid -eq '0') {
      Write-Step ($T.RootUser -f $name)
      if (-not $Yes -and (Confirm-Step ($T.AskCreateUser -f $name))) {
        if (-not (Add-LinuxUser $name)) { return }
      }
      else {
        Write-Info $T.ContinueRoot
      }
    }

    # install.sh reads the terminal for the setup; flags and the language go through bash.
    if ($Ref -ne '') { $url = $RawUrl -f $Ref } else { $url = $InstallShUrl }
    $envs = "CLAUDE_REMOTE_LANG=$lang"
    if ($Ref -ne '') { $envs += " CLAUDE_REMOTE_REF=$Ref" }
    $flags = @()
    if ($Yes) { $flags += '--yes' }
    if ($NoService) { $flags += '--no-service' }
    $command = "curl -fsSL $url | $envs bash -s -- $($flags -join ' ')".Trim()
    Write-Step ($T.RunningLinux -f $name)
    Write-Info "wsl.exe -d $name -- bash -lc '$command'"
    & wsl.exe -d $name -- bash -lc $command
    if ($LASTEXITCODE -ne 0) { Write-Fail ($T.LinuxFailed -f $LASTEXITCODE); return }
    Write-Host ''
    Write-Step ($T.Done -f $name)
  }

  Invoke-Main
}

Install-ClaudeRemote -Ref $Ref -Yes:$Yes -NoService:$NoService -Distro $Distro
