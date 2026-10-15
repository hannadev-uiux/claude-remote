#!/usr/bin/env bash
# Claude Remote installer.
#
#   curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash
#   curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash -s -- --yes   # no questions
#
# Installs (or updates) the daemon from source into ~/.claude-remote/src, builds it and opens
# the guided `claude-remote setup` (accounts and aliases, hooks, background service, pairing).
# Running it again updates to the latest version. Everything lives in main() so a partially
# downloaded script never runs. Messages follow LC_ALL/LC_MESSAGES/LANG (pt*, es*, else English); the
# detected language is passed to the setup as CLAUDE_REMOTE_LANG, the default of its language question.

set -euo pipefail

REPO_URL="${CLAUDE_REMOTE_REPO:-https://github.com/maarkN/claude-remote.git}"
REF="${CLAUDE_REMOTE_REF:-main}"
SRC_DIR="${CLAUDE_REMOTE_SRC:-$HOME/.claude-remote/src}"
MIN_NODE_MAJOR=24

# Messages, in the language of the system. `%s` placeholders are filled with printf.
LOCALE_TAG="${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}"
case "$LOCALE_TAG" in
pt*)
  UI_LANG=pt-BR
  T_USAGE='Uso: install.sh [--ref <branch|tag>] [--yes] [--no-service]'
  T_OPT_REF='versão a instalar (padrão: main). Env: CLAUDE_REMOTE_REF'
  T_OPT_YES='sem perguntas: mantém o config ou usa as contas encontradas'
  T_OPT_NO_SERVICE='não instala o serviço em segundo plano'
  T_OPT_HELP='mostra esta ajuda'
  T_SRC='Código em: %s (env: CLAUDE_REMOTE_SRC)'
  T_INSTALLER='instalador'
  T_MACOS_ONLY='O daemon do Claude Remote roda só no macOS.'
  T_NEED_NODE='É preciso o Node.js %s+: https://nodejs.org (ou `brew install node`).'
  T_NODE_OLD='É preciso o Node.js %s+ (encontrado %s).'
  T_NEED_GIT='É preciso o git: rode `xcode-select --install`.'
  T_MISSING='Faltando: %s. Instale (por exemplo com o Homebrew) e rode de novo.'
  T_BREW='Instalando %s com o Homebrew'
  T_NO_CLAUDE='Claude Code (`claude`) não encontrado no PATH: https://claude.com/claude-code'
  T_UPDATING='Atualizando %s para %s'
  T_DIRTY='%s tem mudanças locais. Faça commit ou descarte, ou use outro diretório em CLAUDE_REMOTE_SRC.'
  T_CLONING='Baixando o Claude Remote (%s) em %s'
  T_FAILED='Falhou: %s (log completo em %s)'
  T_DEPS='Instalando dependências'
  T_BUILD='Compilando o daemon'
  T_REF_VALUE='--ref precisa de um valor'
  T_UNKNOWN='Opção desconhecida: %s (veja --help)'
  ;;
es*)
  UI_LANG=es-ES
  T_USAGE='Uso: install.sh [--ref <rama|tag>] [--yes] [--no-service]'
  T_OPT_REF='versión que se instala (por defecto: main). Env: CLAUDE_REMOTE_REF'
  T_OPT_YES='sin preguntas: mantiene la configuración o usa las cuentas encontradas'
  T_OPT_NO_SERVICE='no instala el servicio en segundo plano'
  T_OPT_HELP='muestra esta ayuda'
  T_SRC='Código en: %s (env: CLAUDE_REMOTE_SRC)'
  T_INSTALLER='instalador'
  T_MACOS_ONLY='El daemon de Claude Remote solo funciona en macOS.'
  T_NEED_NODE='Necesitas Node.js %s+: https://nodejs.org (o `brew install node`).'
  T_NODE_OLD='Necesitas Node.js %s+ (encontrado %s).'
  T_NEED_GIT='Necesitas git: ejecuta `xcode-select --install`.'
  T_MISSING='Falta: %s. Instálalo (por ejemplo con Homebrew) y vuelve a ejecutarlo.'
  T_BREW='Instalando %s con Homebrew'
  T_NO_CLAUDE='No se encontró Claude Code (`claude`) en el PATH: https://claude.com/claude-code'
  T_UPDATING='Actualizando %s a %s'
  T_DIRTY='%s tiene cambios locales. Haz commit o descártalos, o usa otro directorio en CLAUDE_REMOTE_SRC.'
  T_CLONING='Descargando Claude Remote (%s) en %s'
  T_FAILED='Ha fallado: %s (log completo en %s)'
  T_DEPS='Instalando dependencias'
  T_BUILD='Compilando el daemon'
  T_REF_VALUE='--ref necesita un valor'
  T_UNKNOWN='Opción desconocida: %s (consulta --help)'
  ;;
*)
  UI_LANG=en-US
  T_USAGE='Usage: install.sh [--ref <branch|tag>] [--yes] [--no-service]'
  T_OPT_REF='version to install (default: main). Env: CLAUDE_REMOTE_REF'
  T_OPT_YES='no questions: keep the config or use the accounts found'
  T_OPT_NO_SERVICE='do not install the background service'
  T_OPT_HELP='show this help'
  T_SRC='Source in: %s (env: CLAUDE_REMOTE_SRC)'
  T_INSTALLER='installer'
  T_MACOS_ONLY='The Claude Remote daemon runs on macOS only.'
  T_NEED_NODE='Node.js %s+ is required: https://nodejs.org (or `brew install node`).'
  T_NODE_OLD='Node.js %s+ is required (found %s).'
  T_NEED_GIT='git is required: run `xcode-select --install`.'
  T_MISSING='Missing: %s. Install it (e.g. with Homebrew) and run this again.'
  T_BREW='Installing %s with Homebrew'
  T_NO_CLAUDE='Claude Code (`claude`) not found in PATH: https://claude.com/claude-code'
  T_UPDATING='Updating %s to %s'
  T_DIRTY='%s has local changes. Commit or discard them, or use another directory in CLAUDE_REMOTE_SRC.'
  T_CLONING='Downloading Claude Remote (%s) into %s'
  T_FAILED='Failed: %s (full log in %s)'
  T_DEPS='Installing dependencies'
  T_BUILD='Building the daemon'
  T_REF_VALUE='--ref needs a value'
  T_UNKNOWN='Unknown option: %s (see --help)'
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
  -h, --help      $T_OPT_HELP

$(t "$T_SRC" "$SRC_DIR")
EOF
}

require_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || die "$T_MACOS_ONLY"
}

require_node() {
  command -v node >/dev/null 2>&1 || die "$(t "$T_NEED_NODE" "$MIN_NODE_MAJOR")"
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  ((major >= MIN_NODE_MAJOR)) || die "$(t "$T_NODE_OLD" "$MIN_NODE_MAJOR" "$(node --version)")"
}

# tmux and ripgrep are installed with Homebrew when missing; git ships with the Xcode CLT.
require_tools() {
  command -v git >/dev/null 2>&1 || die "$T_NEED_GIT"
  local missing=()
  command -v tmux >/dev/null 2>&1 || missing+=(tmux)
  command -v rg >/dev/null 2>&1 || missing+=(ripgrep)
  if ((${#missing[@]} > 0)); then
    command -v brew >/dev/null 2>&1 || die "$(t "$T_MISSING" "${missing[*]}")"
    step "$(t "$T_BREW" "${missing[*]}")"
    brew install "${missing[@]}" </dev/null
  fi
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
  quiet "${PNPM[@]}" install --frozen-lockfile --filter '@claude-remote/daemon...'
  step "$T_BUILD"
  quiet "${PNPM[@]}" --filter @claude-remote/daemon build
}

main() {
  local setup_args=()
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
    -h | --help)
      usage
      return 0
      ;;
    *) die "$(t "$T_UNKNOWN" "$1")" ;;
    esac
  done

  printf '\n%s✻%s %sClaude Remote%s %s· %s%s\n\n' "$ORANGE" "$RESET" "$BOLD" "$RESET" "$DIM" "$T_INSTALLER" "$RESET"
  require_macos
  require_node
  require_tools
  fetch_source
  build_daemon

  # The wizard asks questions; under `curl | bash` stdin is this script, so it reads the terminal.
  # CLAUDE_REMOTE_LANG is only the default of its language question (an explicit choice still wins).
  export CLAUDE_REMOTE_LANG="${CLAUDE_REMOTE_LANG:-$UI_LANG}"
  local cli=(node "$SRC_DIR/apps/daemon/dist/cli.js" setup "${setup_args[@]+"${setup_args[@]}"}")
  if [[ -t 1 ]] && { : </dev/tty; } 2>/dev/null; then
    "${cli[@]}" </dev/tty
  else
    "${cli[@]}" --yes </dev/null
  fi
}

main "$@"
