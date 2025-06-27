import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildPublished() {
  const projectRoot = join(__dirname, '..');
  const publishedBuildDir = join(projectRoot, 'published-build');

  console.log('Building published version...');

  // Clean up any existing published-build
  if (existsSync(publishedBuildDir)) {
    rmSync(publishedBuildDir, { recursive: true, force: true });
  }

  // Copy local directory to published-build (excluding node_modules, build, shared symlink)
  const localDir = join(projectRoot, 'local');
  const excludeArgs = '--exclude=node_modules --exclude=build --exclude=shared --exclude=.git';
  execSync(`rsync -av ${excludeArgs} ${localDir}/ ${publishedBuildDir}/`, { stdio: 'inherit' });

  // Build the shared package and create symlink to match relative import path
  const sharedDir = join(projectRoot, 'shared');
  const sharedLinkPath = join(publishedBuildDir, 'shared');
  console.log('Building shared package...');
  execSync('npm run build', { cwd: sharedDir, stdio: 'inherit' });

  // Create symlink for relative import path
  execSync(`ln -sf ${sharedDir}/dist ${sharedLinkPath}`, { stdio: 'inherit' });

  // Also copy to node_modules for package resolution
  const sharedDestDir = join(publishedBuildDir, 'node_modules', 'appsignal-mcp-server-shared');
  execSync(`mkdir -p ${dirname(sharedDestDir)}`, { stdio: 'inherit' });
  execSync(`cp -r ${sharedDir}/dist ${sharedDestDir}`, { stdio: 'inherit' });
  execSync(`cp ${sharedDir}/package.json ${sharedDestDir}/`, { stdio: 'inherit' });

  // Install dependencies and build in published-build
  console.log('Installing dependencies in published build...');
  execSync('npm install', { cwd: publishedBuildDir, stdio: 'inherit' });

  console.log('Building published version...');
  // Skip prebuild hooks by running tsc directly instead of npm run build
  execSync('npx tsc', { cwd: publishedBuildDir, stdio: 'inherit' });
  execSync('npx tsc -p tsconfig.integration.json', { cwd: publishedBuildDir, stdio: 'inherit' });

  console.log('Published build completed');
}

buildPublished().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
