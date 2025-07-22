#!/usr/bin/env node

// This script provides ESM support for running vitest
// It imports vitest's CLI directly to ensure proper module resolution

import { startVitest } from 'vitest/node';

// Run vitest with command line arguments
startVitest('test', process.argv.slice(2));
