#!/usr/bin/env node

/**
 * Robust build script for MCP servers that properly propagates TypeScript errors
 *
 * This script replaces the error-prone shell command pattern:
 * "cd shared && npm run build && cd ../local && npm run build"
 *
 * The problem with the shell pattern is that it doesn't properly propagate
 * build failures. If TypeScript compilation fails in 'shared', the script
 * continues to build 'local', resulting in silent failures.
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logStep(message) {
  log(`\n🔨 ${message}`, colors.yellow);
}

/**
 * Run a command and return a promise that resolves/rejects based on exit code
 */
function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    logStep(`${description} in ${path.relative(process.cwd(), cwd)}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to start ${command}: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${description} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });
  });
}

/**
 * Build a directory if it has a package.json with a build script
 */
async function buildDirectory(dirPath, dirName) {
  const packageJsonPath = path.join(dirPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    log(`${colors.dim}Skipping ${dirName} - no package.json found${colors.reset}`);
    return;
  }

  try {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    if (!packageJson.scripts?.build) {
      log(`${colors.dim}Skipping ${dirName} - no build script found${colors.reset}`);
      return;
    }
  } catch (error) {
    logError(`Failed to read package.json in ${dirName}: ${error.message}`);
    throw error;
  }

  await runCommand('npm', ['run', 'build'], dirPath, `Building ${dirName}`);
}

/**
 * Main build function
 */
async function build() {
  const startTime = Date.now();

  // Determine the root directory of the MCP server
  // This script can be called from either the monorepo root or an MCP server directory
  let serverRoot = process.cwd();

  // If we're in the monorepo scripts directory, we need a server path argument
  if (serverRoot.includes('/scripts') && serverRoot.endsWith('mcp-servers/scripts')) {
    if (process.argv.length < 3) {
      logError('Please provide the path to the MCP server directory');
      console.log('Usage: node scripts/build-mcp-server.js <server-path>');
      console.log('Example: node scripts/build-mcp-server.js productionized/pulse-fetch');
      process.exit(1);
    }
    serverRoot = path.resolve(path.dirname(__dirname), process.argv[2]);
  }

  logInfo(`Building MCP server at: ${serverRoot}`);

  // Check if this is a valid MCP server directory
  const packageJsonPath = path.join(serverRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    logError(`Not a valid MCP server directory: ${serverRoot}`);
    logError('No package.json found');
    process.exit(1);
  }

  // Directories to build in order
  const buildDirs = ['shared', 'local'];
  const builtDirs = [];

  try {
    // Build each directory
    for (const dir of buildDirs) {
      const dirPath = path.join(serverRoot, dir);
      if (existsSync(dirPath)) {
        await buildDirectory(dirPath, dir);
        builtDirs.push(dir);
      }
    }

    if (builtDirs.length === 0) {
      logError('No buildable directories found (expected shared/ and/or local/)');
      process.exit(1);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logSuccess(`\nBuild completed successfully in ${duration}s`);
    logInfo(`Built directories: ${builtDirs.join(', ')}`);
  } catch (error) {
    logError(`\nBuild failed: ${error.message}`);

    // Provide helpful error messages for common issues
    if (error.message.includes('Cannot find module')) {
      logInfo('Tip: Try running "npm install" in the failing directory');
    } else if (error.message.includes('error TS')) {
      logInfo('TypeScript compilation errors detected - please fix them and try again');
    }

    process.exit(1);
  }
}

// Run the build
build().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
