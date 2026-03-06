#!/usr/bin/env node
/**
 * Vitest runner that works with ESM modules.
 * Imports vitest's CLI directly to avoid resolution issues.
 */
async function main() {
  const { parseCLI, startVitest } = await import('vitest/node');
  const { filter, options } = parseCLI(['vitest', ...process.argv.slice(2)]);
  const vitest = await startVitest('test', filter, options);
  await vitest?.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
