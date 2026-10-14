import type { CommandItem } from '@claude-remote/protocol'

/**
 * Native Claude Code slash commands. Review on every CLI update. `interactive` commands open a
 * menu in the TUI, so the app switches to the raw terminal after sending them.
 */
export const BUILTIN_COMMANDS: CommandItem[] = [
  { name: 'clear', description: 'Limpa o histórico da conversa', source: 'builtin', interactive: false },
  {
    name: 'compact',
    description: 'Compacta a conversa mantendo um resumo',
    source: 'builtin',
    interactive: false,
  },
  { name: 'context', description: 'Mostra o uso de contexto', source: 'builtin', interactive: false },
  { name: 'cost', description: 'Mostra custo e duração da sessão', source: 'builtin', interactive: false },
  { name: 'usage', description: 'Mostra limites de uso do plano', source: 'builtin', interactive: false },
  { name: 'init', description: 'Cria um CLAUDE.md para o projeto', source: 'builtin', interactive: false },
  { name: 'review', description: 'Revisa um pull request', source: 'builtin', interactive: false },
  { name: 'memory', description: 'Edita arquivos de memória', source: 'builtin', interactive: true },
  { name: 'model', description: 'Escolhe o modelo', source: 'builtin', interactive: true },
  { name: 'config', description: 'Abre as configurações', source: 'builtin', interactive: true },
  { name: 'permissions', description: 'Gerencia regras de permissão', source: 'builtin', interactive: true },
  { name: 'agents', description: 'Gerencia subagentes', source: 'builtin', interactive: true },
  { name: 'mcp', description: 'Gerencia servidores MCP', source: 'builtin', interactive: true },
  { name: 'resume', description: 'Retoma uma conversa anterior', source: 'builtin', interactive: true },
  { name: 'login', description: 'Entra com outra conta', source: 'builtin', interactive: true },
  { name: 'hooks', description: 'Gerencia hooks', source: 'builtin', interactive: true },
  { name: 'plugin', description: 'Gerencia plugins', source: 'builtin', interactive: true },
  {
    name: 'status',
    description: 'Mostra status da conta e do sistema',
    source: 'builtin',
    interactive: true,
  },
  { name: 'doctor', description: 'Diagnostica a instalação', source: 'builtin', interactive: true },
  {
    name: 'rewind',
    description: 'Volta a conversa/código a um ponto anterior',
    source: 'builtin',
    interactive: true,
  },
  { name: 'export', description: 'Exporta a conversa', source: 'builtin', interactive: true },
  { name: 'help', description: 'Ajuda', source: 'builtin', interactive: true },
  { name: 'exit', description: 'Encerra a sessão', source: 'builtin', interactive: false },
]
