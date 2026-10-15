## Decisions

- **Bootstrap in bash, wizard in TypeScript.** `install.sh` only ensures prerequisites, code and build (everything inside `main()`, so a partial download never executes). The questions live in `claude-remote setup`, which reuses the config schema, atomic writes and the installers, and has its pure logic tested.
- **`curl | bash` and stdin.** bash's stdin is the script itself, so the wizard reads from `/dev/tty`. Without a terminal (CI), it runs `setup --yes`.
- **Prompts with `@inquirer/prompts`** and a custom theme (`❯` cursor, orange `#D97757` highlight), similar to Claude Code's menus.
- **Profile detection:** `~/.claude` and `~/.claude-*` directories in the home folder. Suggestions: already configured profiles keep their id/name; `~/.claude` suggests `claudin`/"Personal"; `~/.claude-<x>` suggests `claude-<x>`/"<X>".
- **Alias validation:** `^[a-z][a-z0-9_-]{0,31}$`, unique, and never `claude` or `claude-remote` (the launcher calls `claude`, and its directory comes first in PATH). If the alias is already a system command, the wizard warns and asks for confirmation.
- **Removal:** profiles dropped from the config have their launcher and hooks removed, without touching anything else.
- **Code in `~/.claude-remote/src`** (shallow clone). Updating does `fetch` + `checkout` of the ref and refuses if there are local changes.
- **Redirect on the website** via `redirects()` in `next.config.ts` (307, not cached), pointing to `raw.githubusercontent.com/.../main/install.sh`. The language proxy already ignores paths containing a dot.
