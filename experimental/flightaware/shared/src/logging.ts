export function logServerStart(serverName: string, transport: string = 'stdio'): void {
  console.error(`MCP server ${serverName} running on ${transport}`);
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[ERROR] ${context}: ${message}`);
  if (stack) console.error(stack);
}
