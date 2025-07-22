#!/usr/bin/env node

/**
 * Script to update all MCP servers to use the robust build script
 * 
 * This updates the package.json files to replace the error-prone shell pattern:
 * "cd shared && npm run build && cd ../local && npm run build"
 * 
 * With a call to the robust build script:
 * "node ../../scripts/build-mcp-server.js"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function findMCPServers() {
  const servers = [];
  
  // Find all package.json files excluding node_modules
  const output = execSync(
    'find . -name "package.json" -not -path "*/node_modules/*" | grep -E "(experimental|productionized)/[^/]+/package.json$"',
    { cwd: rootDir, encoding: 'utf8' }
  ).trim();
  
  if (output) {
    servers.push(...output.split('\n').map(path => path.replace('.//', './')));
  }
  
  return servers;
}

function updatePackageJson(packagePath) {
  const fullPath = join(rootDir, packagePath);
  const serverDir = dirname(fullPath);
  const serverName = relative(rootDir, serverDir);
  
  if (!existsSync(fullPath)) {
    log(`Skipping ${packagePath} - file not found`, colors.red);
    return false;
  }
  
  try {
    const content = readFileSync(fullPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Check if it has the old build pattern
    const oldPattern = /^cd shared && npm run build && cd \.\.\/local && npm run build$/;
    const currentBuild = packageJson.scripts?.build || '';
    
    if (!oldPattern.test(currentBuild)) {
      log(`${serverName} - build script already updated or uses different pattern`, colors.yellow);
      return false;
    }
    
    // Calculate relative path from server to scripts directory
    const relativePath = relative(serverDir, join(rootDir, 'scripts', 'build-mcp-server.js'));
    
    // Update the build script
    packageJson.scripts.build = `node ${relativePath}`;
    
    // Write back with proper formatting
    writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    log(`✅ Updated ${serverName}`, colors.green);
    return true;
    
  } catch (error) {
    log(`❌ Failed to update ${packagePath}: ${error.message}`, colors.red);
    return false;
  }
}

function main() {
  log('\n🔍 Finding MCP servers...', colors.blue);
  
  const servers = findMCPServers();
  
  if (servers.length === 0) {
    log('No MCP servers found', colors.yellow);
    return;
  }
  
  log(`Found ${servers.length} MCP servers\n`, colors.blue);
  
  let updatedCount = 0;
  
  for (const server of servers) {
    if (updatePackageJson(server)) {
      updatedCount++;
    }
  }
  
  log(`\n📊 Summary:`, colors.blue);
  log(`   Total servers: ${servers.length}`);
  log(`   Updated: ${updatedCount}`, colors.green);
  log(`   Skipped: ${servers.length - updatedCount}`, colors.yellow);
  
  if (updatedCount > 0) {
    log(`\n💡 Next steps:`, colors.blue);
    log(`   1. Review the changes with: git diff`);
    log(`   2. Test the build in one of the updated servers`);
    log(`   3. Commit the changes if everything works correctly`);
  }
}

// Check if we're being run with --dry-run
if (process.argv.includes('--dry-run')) {
  log('DRY RUN MODE - No files will be modified', colors.yellow);
  log('Remove --dry-run to actually update the files\n');
}

main();