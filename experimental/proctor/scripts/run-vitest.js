#!/usr/bin/env node
/**
 * Vitest CLI wrapper with proper ESM support
 */
import { startVitest } from 'vitest/node';

const args = process.argv.slice(2);

// Parse config file from args
let configFile = 'vitest.config.ts';
const configIndex = args.indexOf('-c');
if (configIndex !== -1 && args[configIndex + 1]) {
  configFile = args[configIndex + 1];
  args.splice(configIndex, 2);
}

// Check for run mode
const isRunMode = args.includes('run');
if (isRunMode) {
  args.splice(args.indexOf('run'), 1);
}

// Check for UI mode
const isUIMode = args.includes('--ui');
if (isUIMode) {
  args.splice(args.indexOf('--ui'), 1);
}

const vitest = await startVitest('test', args, {
  watch: !isRunMode,
  ui: isUIMode,
  config: configFile,
});

if (!vitest) {
  process.exit(1);
}

// In run mode, exit when done
if (isRunMode) {
  await vitest.close();
}
