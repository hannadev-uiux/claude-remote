#!/usr/bin/env bash
# Claude Remote installer.
#
#   curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash
#   curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash -s -- --yes   # sem perguntas
#
# Installs (or updates) the daemon from source into ~/.claude-remote/src, builds it and opens
# the guided `claude-remote setup` (accounts and aliases, hooks, background service, pairing).
# Running it again updates to the latest version. Everything lives in main() so a partially
# downloaded script never runs.

set -euo pipefail

REPO_URL="${CLAUDE_REMOTE_REPO:-https://github.com/maarkN/claude-remote.git}"
REF="${CLAUDE_REMOTE_REF:-main}"
SRC_DIR="${CLAUDE_REMOTE_SRC:-$HOME/.claude-remote/src}"
MIN_NODE_MAJOR=24

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

usage() {
  cat <<EOF
Uso: install.sh [--ref <branch|tag>] [--yes] [--no-service]

  --ref <ref>     versão a instalar (padrão: main). Env: CLAUDE_REMOTE_REF
  --yes, -y       sem perguntas: mantém o config ou usa as contas encontradas
  --no-service    não instala o serviço em segundo plano
  -h, --help      mostra esta ajuda

Código em: $SRC_DIR (env: CLAUDE_REMOTE_SRC)
EOF
}

require_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || die "O daemon do Claude Remote roda só no macOS."
}

require_node() {
  command -v node >/dev/null 2>&1 || die "É preciso o Node.js ${MIN_NODE_MAJOR}+: https://nodejs.org (ou \`brew install node\`)."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  ((major >= MIN_NODE_MAJOR)) || die "É preciso o Node.js ${MIN_NODE_MAJOR}+ (encontrado $(node --version))."
}

# tmux and ripgrep are installed with Homebrew when missing; git ships with the Xcode CLT.
require_tools() {
  command -v git >/dev/null 2>&1 || die "É preciso o git: rode \`xcode-select --install\`."
  local missing=()
  command -v tmux >/dev/null 2>&1 || missing+=(tmux)
  command -v rg >/dev/null 2>&1 || missing+=(ripgrep)
  if ((${#missing[@]} > 0)); then
    command -v brew >/dev/null 2>&1 || die "Faltando: ${missing[*]}. Instale (por exemplo com o Homebrew) e rode de novo."
    step "Instalando ${missing[*]} com o Homebrew"
    brew install "${missing[@]}" </dev/null
  fi
  command -v claude >/dev/null 2>&1 || warn "Claude Code (\`claude\`) não encontrado no PATH: https://claude.com/claude-code"
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
    step "Atualizando $SRC_DIR para $REF"
    [[ -z "$(git -C "$SRC_DIR" status --porcelain --untracked-files=no)" ]] ||
      die "$SRC_DIR tem mudanças locais. Faça commit ou descarte, ou use outro diretório em CLAUDE_REMOTE_SRC."
    git -C "$SRC_DIR" fetch --quiet --depth 1 origin "$REF" </dev/null
    git -C "$SRC_DIR" checkout --quiet --detach FETCH_HEAD </dev/null
  else
    step "Baixando o Claude Remote ($REF) em $SRC_DIR"
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
    die "Falhou: $* (log completo em $log)"
  fi
}

build_daemon() {
  pnpm_cmd
  step "Instalando dependências"
  quiet "${PNPM[@]}" install --frozen-lockfile --filter '@claude-remote/daemon...'
  step "Compilando o daemon"
  quiet "${PNPM[@]}" --filter @claude-remote/daemon build
}

main() {
  local setup_args=()
  while (($# > 0)); do
    case "$1" in
    --ref)
      [[ $# -ge 2 ]] || die "--ref precisa de um valor"
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
    *) die "Opção desconhecida: $1 (veja --help)" ;;
    esac
  done

  printf '\n%s✻%s %sClaude Remote%s %s· instalador%s\n\n' "$ORANGE" "$RESET" "$BOLD" "$RESET" "$DIM" "$RESET"
  require_macos
  require_node
  require_tools
  fetch_source
  build_daemon

  # The wizard asks questions; under `curl | bash` stdin is this script, so it reads the terminal.
  local cli=(node "$SRC_DIR/apps/daemon/dist/cli.js" setup "${setup_args[@]+"${setup_args[@]}"}")
  if [[ -t 1 ]] && { : </dev/tty; } 2>/dev/null; then
    "${cli[@]}" </dev/tty
  else
    "${cli[@]}" --yes </dev/null
  fi
}

main "$@"
