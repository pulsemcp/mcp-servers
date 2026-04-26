#!/usr/bin/env node
/**
 * Prepares the local package for npm publishing
 * - Builds the shared module
 * - Copies built files (instead of symlinks)
 */

import { cp, readFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function preparePublish() {
  console.log('Preparing for npm publish...');

  // Build elicitation library first (shared depends on it). Wipe build/ before
  // invoking tsc so the resulting bundle is a deterministic function of the
  // current source — no risk of stale incremental output surviving a bump.
  // --ignore-scripts avoids triggering the monorepo root's husky prepare hook.
  const elicitationDir = join(__dirname, '../../../libs/elicitation');
  console.log('Building elicitation library (clean rebuild)...');
  await rm(join(elicitationDir, 'build'), { recursive: true, force: true });
  execSync('npm install --ignore-scripts && npm run build', {
    cwd: elicitationDir,
    stdio: 'inherit',
  });

  // Build shared (depends on elicitation)
  console.log('Building shared module...');
  execSync('npm install && npm run build', {
    cwd: join(__dirname, '../shared'),
    stdio: 'inherit',
  });

  // Build local using symlink (like dev)
  console.log('Setting up development symlink...');
  execSync('node setup-dev.js', { cwd: __dirname, stdio: 'inherit' });

  console.log('Building local module...');
  execSync('npx --package typescript tsc', {
    cwd: __dirname,
    stdio: 'inherit',
  });

  // Remove symlink and copy actual files
  const sharedPath = join(__dirname, 'shared');

  if (existsSync(sharedPath)) {
    await rm(sharedPath, { recursive: true, force: true });
  }

  await mkdir(sharedPath, { recursive: true });

  console.log('Copying shared build files...');
  await cp(join(__dirname, '../shared/build'), sharedPath, { recursive: true });

  const elicitationNodeModulesPath = join(__dirname, 'node_modules/@pulsemcp/mcp-elicitation');
  if (existsSync(elicitationNodeModulesPath)) {
    await rm(elicitationNodeModulesPath, { recursive: true, force: true });
  }
  await mkdir(elicitationNodeModulesPath, { recursive: true });

  console.log('Copying elicitation build files...');
  await cp(join(elicitationDir, 'build'), join(elicitationNodeModulesPath, 'build'), {
    recursive: true,
  });
  await cp(join(elicitationDir, 'package.json'), join(elicitationNodeModulesPath, 'package.json'));

  // Tripwire: the bundled lib's package.json must match the source's. If they
  // diverge, the bundle is stale (e.g. drift between internal monorepo and
  // public repo libs/elicitation/) and shipping it would silently regress
  // every consumer. Fail the publish loudly — see fix in 2026-04 where
  // onepassword 0.3.5 / gmail 0.4.7 shipped stale @pulsemcp/mcp-elicitation@1.0.1.
  const sourceVersion = JSON.parse(
    await readFile(join(elicitationDir, 'package.json'), 'utf8')
  ).version;
  const bundledVersion = JSON.parse(
    await readFile(join(elicitationNodeModulesPath, 'package.json'), 'utf8')
  ).version;
  if (sourceVersion !== bundledVersion) {
    console.error(
      `Elicitation lib version mismatch: source=${sourceVersion} bundled=${bundledVersion}.\n` +
        `The bundle would ship a stale lib. Investigate libs/elicitation/ drift before publishing.`
    );
    process.exit(1);
  }

  console.log(`Ready for npm publish! (elicitation lib ${bundledVersion} bundled)`);
}

preparePublish().catch((error) => {
  console.error('Prepare publish failed:', error);
  process.exit(1);
});
