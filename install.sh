#!/usr/bin/env bash
# Remote Harness installer.
#
#   curl -fsSL https://remoteharness.app/install.sh | bash
#   curl -fsSL https://remoteharness.app/install.sh | bash -s -- --yes   # no questions
#
# Runs on macOS and Linux. Missing tools (tmux, ripgrep, zsh, git) are installed with apt-get, dnf,
# pacman or zypper (with sudo, after saying why) or Homebrew; Node 24+ must already be installed.
# Installs (or updates) the daemon from source into ~/.remote-harness/src, builds it and opens
# the guided `remote-harness setup` (accounts and aliases, hooks, background service, pairing).
# Running it again updates to the latest version; `--update` (what `remote-harness update` runs)
# skips the wizard and only refreshes launchers/hooks and restarts the service. Everything lives in
# main() so a partially downloaded script never runs. Messages follow REMOTE_HARNESS_LANG, then
# LC_ALL/LC_MESSAGES/LANG (pt*, es*, else English); the
# detected language is passed to the setup as REMOTE_HARNESS_LANG, the default of its language question.
# Every REMOTE_HARNESS_* variable falls back to its CLAUDE_REMOTE_* name from before the rename.

set -euo pipefail

REPO_URL="${REMOTE_HARNESS_REPO:-${CLAUDE_REMOTE_REPO:-https://github.com/maarkN/remote-harness.git}}"
REF="${REMOTE_HARNESS_REF:-${CLAUDE_REMOTE_REF:-main}}"
# Data directory, as the daemon resolves it: an install made before the rename keeps ~/.claude-remote.
DATA_DIR="${REMOTE_HARNESS_HOME:-${CLAUDE_REMOTE_HOME:-}}"
if [[ -z "$DATA_DIR" ]]; then
  DATA_DIR="$HOME/.remote-harness"
  if [[ ! -d "$DATA_DIR" && -d "$HOME/.claude-remote" ]]; then DATA_DIR="$HOME/.claude-remote"; fi
fi
SRC_DIR="${REMOTE_HARNESS_SRC:-${CLAUDE_REMOTE_SRC:-$DATA_DIR/src}}"
MIN_NODE_MAJOR=24
# Private Node used when the system one is missing or too old (never added to the user's shell).
NODE_DIR="${REMOTE_HARNESS_NODE_DIR:-${CLAUDE_REMOTE_NODE_DIR:-$DATA_DIR/node}}"

# Messages, in the language of the system. `%s` placeholders are filled with printf.
LOCALE_TAG="${REMOTE_HARNESS_LANG:-${CLAUDE_REMOTE_LANG:-${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}}}"
case "$LOCALE_TAG" in
pt*)
  UI_LANG=pt-BR
  T_USAGE='Uso: install.sh [--ref <branch|tag>] [--yes] [--no-service] [--update]'
  T_OPT_REF='versão a instalar (padrão: main). Env: REMOTE_HARNESS_REF'
  T_OPT_YES='sem perguntas: mantém o config ou usa as contas encontradas'
  T_OPT_NO_SERVICE='não instala o serviço em segundo plano'
  T_OPT_HELP='mostra esta ajuda'
  T_SRC='Código em: %s (env: REMOTE_HARNESS_SRC)'
  T_INSTALLER='instalador'
  T_UNSUPPORTED='Sistema não suportado (%s). O Remote Harness roda em macOS e Linux.'
  T_WINDOWS='No Windows, o Remote Harness roda dentro do WSL2. No PowerShell: irm https://remoteharness.app/install.ps1 | iex'
  T_NEED_NODE='É preciso o Node.js %s+: https://nodejs.org (ou `brew install node`, nvm, fnm…).'
  T_NODE_PRIVATE='Node.js %s+ não encontrado: baixando o Node %s só para o Remote Harness em %s (não muda o seu Node).'
  T_NODE_DOWNLOAD_FAILED='Não consegui baixar o Node.js (%s). Instale o Node.js %s+ (https://nodejs.org) e rode de novo.'
  T_NEED_GIT='É preciso o git: rode `xcode-select --install`.'
  T_MISSING='Faltando: %s. Instale com o gerenciador de pacotes do sistema e rode de novo.'
  T_INSTALLING='Instalando %s com %s'
  T_SUDO_WHY='Instalar pacotes do sistema exige permissão de administrador: o sudo pode pedir sua senha.'
  T_NO_SUDO='Faltando: %s. Instale como root (sudo não encontrado) e rode de novo.'
  T_NO_CLAUDE='Claude Code (`claude`) não encontrado no PATH: https://claude.com/claude-code'
  T_UPDATING='Atualizando %s para %s'
  T_DIRTY='%s tem mudanças locais. Faça commit ou descarte, ou use outro diretório em REMOTE_HARNESS_SRC.'
  T_CLONING='Baixando o Remote Harness (%s) em %s'
  T_FAILED='Falhou: %s (log completo em %s)'
  T_DEPS='Instalando dependências'
  T_BUILD='Compilando o daemon'
  T_REF_VALUE='--ref precisa de um valor'
  T_UNKNOWN='Opção desconhecida: %s (veja --help)'
  T_OPT_UPDATE='só atualiza: compila e reinicia o serviço, sem o assistente (= remote-harness update)'
  T_NOT_INSTALLED='O Remote Harness ainda não está instalado em %s: rode o instalador sem --update.'
  ;;
es*)
  UI_LANG=es-ES
  T_USAGE='Uso: install.sh [--ref <rama|tag>] [--yes] [--no-service] [--update]'
  T_OPT_REF='versión que se instala (por defecto: main). Env: REMOTE_HARNESS_REF'
  T_OPT_YES='sin preguntas: mantiene la configuración o usa las cuentas encontradas'
  T_OPT_NO_SERVICE='no instala el servicio en segundo plano'
  T_OPT_HELP='muestra esta ayuda'
  T_SRC='Código en: %s (env: REMOTE_HARNESS_SRC)'
  T_INSTALLER='instalador'
  T_UNSUPPORTED='Sistema no compatible (%s). Remote Harness funciona en macOS y Linux.'
  T_WINDOWS='En Windows, Remote Harness funciona dentro de WSL2. En PowerShell: irm https://remoteharness.app/install.ps1 | iex'
  T_NEED_NODE='Necesitas Node.js %s+: https://nodejs.org (o `brew install node`, nvm, fnm…).'
  T_NODE_PRIVATE='No se encontró Node.js %s+: descargando Node %s solo para Remote Harness en %s (no cambia tu Node).'
  T_NODE_DOWNLOAD_FAILED='No se pudo descargar Node.js (%s). Instala Node.js %s+ (https://nodejs.org) y vuelve a ejecutarlo.'
  T_NEED_GIT='Necesitas git: ejecuta `xcode-select --install`.'
  T_MISSING='Falta: %s. Instálalo con el gestor de paquetes del sistema y vuelve a ejecutarlo.'
  T_INSTALLING='Instalando %s con %s'
  T_SUDO_WHY='Instalar paquetes del sistema requiere permisos de administrador: sudo puede pedirte la contraseña.'
  T_NO_SUDO='Falta: %s. Instálalo como root (no se encontró sudo) y vuelve a ejecutarlo.'
  T_NO_CLAUDE='No se encontró Claude Code (`claude`) en el PATH: https://claude.com/claude-code'
  T_UPDATING='Actualizando %s a %s'
  T_DIRTY='%s tiene cambios locales. Haz commit o descártalos, o usa otro directorio en REMOTE_HARNESS_SRC.'
  T_CLONING='Descargando Remote Harness (%s) en %s'
  T_FAILED='Ha fallado: %s (log completo en %s)'
  T_DEPS='Instalando dependencias'
  T_BUILD='Compilando el daemon'
  T_REF_VALUE='--ref necesita un valor'
  T_UNKNOWN='Opción desconocida: %s (consulta --help)'
  T_OPT_UPDATE='solo actualiza: compila y reinicia el servicio, sin el asistente (= remote-harness update)'
  T_NOT_INSTALLED='Remote Harness todavía no está instalado en %s: ejecuta el instalador sin --update.'
  ;;
*)
  UI_LANG=en-US
  T_USAGE='Usage: install.sh [--ref <branch|tag>] [--yes] [--no-service] [--update]'
  T_OPT_REF='version to install (default: main). Env: REMOTE_HARNESS_REF'
  T_OPT_YES='no questions: keep the config or use the accounts found'
  T_OPT_NO_SERVICE='do not install the background service'
  T_OPT_HELP='show this help'
  T_SRC='Source in: %s (env: REMOTE_HARNESS_SRC)'
  T_INSTALLER='installer'
  T_UNSUPPORTED='Unsupported system (%s). Remote Harness runs on macOS and Linux.'
  T_WINDOWS='On Windows, Remote Harness runs inside WSL2. In PowerShell: irm https://remoteharness.app/install.ps1 | iex'
  T_NEED_NODE='Node.js %s+ is required: https://nodejs.org (or `brew install node`, nvm, fnm…).'
  T_NODE_PRIVATE='Node.js %s+ not found: downloading Node %s just for Remote Harness into %s (your Node is untouched).'
  T_NODE_DOWNLOAD_FAILED='Could not download Node.js (%s). Install Node.js %s+ (https://nodejs.org) and run this again.'
  T_NEED_GIT='git is required: run `xcode-select --install`.'
  T_MISSING='Missing: %s. Install it with your package manager and run this again.'
  T_INSTALLING='Installing %s with %s'
  T_SUDO_WHY='Installing system packages needs administrator rights: sudo may ask for your password.'
  T_NO_SUDO='Missing: %s. Install it as root (sudo not found) and run this again.'
  T_NO_CLAUDE='Claude Code (`claude`) not found in PATH: https://claude.com/claude-code'
  T_UPDATING='Updating %s to %s'
  T_DIRTY='%s has local changes. Commit or discard them, or use another directory in REMOTE_HARNESS_SRC.'
  T_CLONING='Downloading Remote Harness (%s) into %s'
  T_FAILED='Failed: %s (full log in %s)'
  T_DEPS='Installing dependencies'
  T_BUILD='Building the daemon'
  T_REF_VALUE='--ref needs a value'
  T_UNKNOWN='Unknown option: %s (see --help)'
  T_OPT_UPDATE='update only: build and restart the service, without the wizard (= remote-harness update)'
  T_NOT_INSTALLED='Remote Harness is not installed in %s yet: run the installer without --update.'
  ;;
esac

if [[ -t 1 ]]; then
  BOLD=$'\033[1m' DIM=$'\033[2m' ORANGE=$'\033[38;2;217;119;87m' RED=$'\033[31m' RESET=$'\033[0m'
else
  BOLD='' DIM='' ORANGE='' RED='' RESET=''
fi

step() { printf '%s▸%s %s\n' "$ORANGE" "$RESET" "$*"; }
info() { printf '  %s%s%s\n' "$DIM" "$*" "$RESET"; }
warn() { printf '%s!%s %s\n' "$ORANGE" "$RESET" "$*" >&2; }
die() {
  printf '%s✗ %s%s\n' "$RED" "$*" "$RESET" >&2
  exit 1
}

# Fills the `%s` of a message: t "$T_X" arg...
# shellcheck disable=SC2059
t() {
  local format="$1"
  shift
  printf "$format" "$@"
}

usage() {
  cat <<EOF
$T_USAGE

  --ref <ref>     $T_OPT_REF
  --yes, -y       $T_OPT_YES
  --no-service    $T_OPT_NO_SERVICE
  --update        $T_OPT_UPDATE
  -h, --help      $T_OPT_HELP

$(t "$T_SRC" "$SRC_DIR")
EOF
}

# darwin or linux; anything else stops here.
detect_platform() {
  local system
  system="$(uname -s)"
  case "$system" in
  Darwin) PLATFORM=darwin ;;
  Linux) PLATFORM=linux ;;
  MINGW* | MSYS* | CYGWIN*) die "$T_WINDOWS" ;;
  *) die "$(t "$T_UNSUPPORTED" "$system")" ;;
  esac
}

node_major() {
  "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# Downloads the latest Node $MIN_NODE_MAJOR for this OS/CPU from nodejs.org into $NODE_DIR, checking
# its SHA-256 against the official SHASUMS256.txt.
install_private_node() {
  local os arch base sums file version tmp
  os="$PLATFORM"
  case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) die "$(t "$T_NODE_DOWNLOAD_FAILED" "$(uname -m)" "$MIN_NODE_MAJOR")" ;;
  esac
  base="https://nodejs.org/dist/latest-v${MIN_NODE_MAJOR}.x"
  sums="$(curl -fsSL "$base/SHASUMS256.txt")" || die "$(t "$T_NODE_DOWNLOAD_FAILED" "$base" "$MIN_NODE_MAJOR")"
  file="$(printf '%s\n' "$sums" | awk -v suffix="-$os-$arch.tar.gz" '$2 ~ suffix"$" {print $2; exit}')"
  [[ -n "$file" ]] || die "$(t "$T_NODE_DOWNLOAD_FAILED" "$os-$arch" "$MIN_NODE_MAJOR")"
  version="${file#node-}"
  version="${version%%-*}"
  step "$(t "$T_NODE_PRIVATE" "$MIN_NODE_MAJOR" "$version" "$NODE_DIR")"
  tmp="$(mktemp -d)"
  if ! curl -fsSL "$base/$file" -o "$tmp/$file" ||
    [[ "$(sha256_of "$tmp/$file")" != "$(printf '%s\n' "$sums" | awk -v f="$file" '$2 == f {print $1}')" ]]; then
    rm -rf "$tmp"
    die "$(t "$T_NODE_DOWNLOAD_FAILED" "$file" "$MIN_NODE_MAJOR")"
  fi
  tar -xzf "$tmp/$file" -C "$tmp"
  rm -rf "$NODE_DIR"
  mkdir -p "$(dirname "$NODE_DIR")"
  mv "$tmp/${file%.tar.gz}" "$NODE_DIR"
  rm -rf "$tmp"
}

# Uses the system Node when it is new enough, else the private one (downloading it when needed).
require_node() {
  if command -v node >/dev/null 2>&1 && (($(node_major node) >= MIN_NODE_MAJOR)); then
    return 0
  fi
  if [[ ! -x "$NODE_DIR/bin/node" ]] || (($(node_major "$NODE_DIR/bin/node") < MIN_NODE_MAJOR)); then
    command -v curl >/dev/null 2>&1 || die "$(t "$T_NEED_NODE" "$MIN_NODE_MAJOR")"
    install_private_node
  fi
  export PATH="$NODE_DIR/bin:$PATH"
}

# First package manager found: the system one on Linux, else Homebrew.
package_manager() {
  local pm
  for pm in apt-get dnf pacman zypper brew; do
    if command -v "$pm" >/dev/null 2>&1; then
      printf '%s\n' "$pm"
      return 0
    fi
  done
  return 1
}

# install_packages <package>...: installs with the package manager found. System managers need root,
# so sudo is used (after saying why) unless this already runs as root. Homebrew never uses sudo.
install_packages() {
  local pm
  pm="$(package_manager)" || die "$(t "$T_MISSING" "$*")"
  step "$(t "$T_INSTALLING" "$*" "$pm")"
  if [[ "$pm" == brew ]]; then
    brew install "$@" </dev/null
    return
  fi
  local sudo=()
  if ((EUID != 0)); then
    command -v sudo >/dev/null 2>&1 || die "$(t "$T_NO_SUDO" "$*")"
    info "$T_SUDO_WHY"
    sudo=(sudo)
  fi
  case "$pm" in
  apt-get)
    "${sudo[@]+"${sudo[@]}"}" env DEBIAN_FRONTEND=noninteractive apt-get update -qq </dev/null
    "${sudo[@]+"${sudo[@]}"}" env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" </dev/null
    ;;
  dnf) "${sudo[@]+"${sudo[@]}"}" dnf install -y "$@" </dev/null ;;
  pacman) "${sudo[@]+"${sudo[@]}"}" pacman -S --needed --noconfirm "$@" </dev/null ;;
  zypper) "${sudo[@]+"${sudo[@]}"}" zypper --non-interactive install "$@" </dev/null ;;
  esac
}

# Packages whose command is missing: tmux, ripgrep, zsh (runs the launchers) and git (on macOS git
# comes with the Xcode Command Line Tools and is checked before).
missing_packages() {
  local pkg cmd
  for pkg in tmux ripgrep zsh git; do
    cmd="$pkg"
    [[ "$pkg" == ripgrep ]] && cmd=rg
    command -v "$cmd" >/dev/null 2>&1 || printf '%s\n' "$pkg"
  done
}

require_tools() {
  if [[ "$PLATFORM" == darwin ]]; then
    command -v git >/dev/null 2>&1 || die "$T_NEED_GIT"
  fi
  local missing=()
  local pkg
  while IFS= read -r pkg; do
    [[ -n "$pkg" ]] && missing+=("$pkg")
  done < <(missing_packages)
  ((${#missing[@]} == 0)) || install_packages "${missing[@]}"
  command -v claude >/dev/null 2>&1 || warn "$T_NO_CLAUDE"
}

# Uses the pnpm pinned in package.json ("packageManager") when the local one is older.
pnpm_cmd() {
  local wanted
  wanted="$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$SRC_DIR/package.json")"
  if command -v pnpm >/dev/null 2>&1 && [[ "$(pnpm --version 2>/dev/null)" == "$wanted" ]]; then
    PNPM=(pnpm)
  else
    PNPM=(npx --yes "pnpm@$wanted")
  fi
}

fetch_source() {
  if [[ -d "$SRC_DIR/.git" ]]; then
    step "$(t "$T_UPDATING" "$SRC_DIR" "$REF")"
    [[ -z "$(git -C "$SRC_DIR" status --porcelain --untracked-files=no)" ]] ||
      die "$(t "$T_DIRTY" "$SRC_DIR")"
    git -C "$SRC_DIR" fetch --quiet --depth 1 origin "$REF" </dev/null
    git -C "$SRC_DIR" checkout --quiet --detach FETCH_HEAD </dev/null
  else
    step "$(t "$T_CLONING" "$REF" "$SRC_DIR")"
    mkdir -p "$(dirname "$SRC_DIR")"
    git clone --quiet --depth 1 --branch "$REF" "$REPO_URL" "$SRC_DIR" </dev/null
  fi
  info "$(git -C "$SRC_DIR" log -1 --format='%h %s')"
}

# Runs quietly; on failure shows the end of the log so the error is visible.
quiet() {
  local log="$SRC_DIR/.install.log"
  if ! (cd "$SRC_DIR" && NPM_CONFIG_UPDATE_NOTIFIER=false "$@") </dev/null >"$log" 2>&1; then
    tail -n 30 "$log" >&2
    die "$(t "$T_FAILED" "$*" "$log")"
  fi
}

build_daemon() {
  pnpm_cmd
  step "$T_DEPS"
  quiet "${PNPM[@]}" install --frozen-lockfile --filter '@remote-harness/daemon...'
  step "$T_BUILD"
  quiet "${PNPM[@]}" --filter @remote-harness/daemon build
}

# Version of the code in $SRC_DIR (before fetching), shown by `remote-harness update --finish`.
installed_version() {
  sed -n 's/^  "version": "\(.*\)",$/\1/p' "$SRC_DIR/apps/daemon/package.json" 2>/dev/null | head -n 1
}

main() {
  local setup_args=() update=false from
  while (($# > 0)); do
    case "$1" in
    --ref)
      [[ $# -ge 2 ]] || die "$T_REF_VALUE"
      REF="$2"
      shift 2
      ;;
    --no-service | --yes | -y)
      setup_args+=("$1")
      shift
      ;;
    --update)
      update=true
      shift
      ;;
    -h | --help)
      usage
      return 0
      ;;
    *) die "$(t "$T_UNKNOWN" "$1")" ;;
    esac
  done

  printf '\n%s✻%s %sRemote Harness%s %s· %s%s\n\n' "$ORANGE" "$RESET" "$BOLD" "$RESET" "$DIM" "$T_INSTALLER" "$RESET"
  detect_platform
  require_node
  require_tools
  if $update; then
    [[ -d "$SRC_DIR/.git" ]] || die "$(t "$T_NOT_INSTALLED" "$SRC_DIR")"
    # `remote-harness update` checks out the new code first, so it passes the version it replaced.
    from="${REMOTE_HARNESS_UPDATE_FROM:-${CLAUDE_REMOTE_UPDATE_FROM:-$(installed_version)}}"
  fi
  fetch_source
  build_daemon

  # No wizard: the new CLI refreshes launchers and hooks and restarts the service when installed.
  if $update; then
    node "$SRC_DIR/apps/daemon/dist/cli.js" update --finish ${from:+--from "$from"} </dev/null
    return
  fi

  # The wizard asks questions; under `curl | bash` stdin is this script, so it reads the terminal.
  # REMOTE_HARNESS_LANG is only the default of its language question (an explicit choice still wins).
  export REMOTE_HARNESS_LANG="${REMOTE_HARNESS_LANG:-${CLAUDE_REMOTE_LANG:-$UI_LANG}}"
  local cli=(node "$SRC_DIR/apps/daemon/dist/cli.js" setup "${setup_args[@]+"${setup_args[@]}"}")
  if [[ -t 1 ]] && { : </dev/tty; } 2>/dev/null; then
    "${cli[@]}" </dev/tty
  else
    "${cli[@]}" --yes </dev/null
  fi
}

# Runs only when executed (`bash install.sh`, `curl … | bash`), not when sourced (tests).
if [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
  main "$@"
fi
