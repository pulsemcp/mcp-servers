import path from 'path';
import { fileURLToPath } from 'url';
import { runIntegrationTests } from './test-runner.js';
import { execSync } from 'child_process';
import { rm, cp } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run tests in built mode
runIntegrationTests({
  name: 'BUILT',
  serverPath: path.join(__dirname, '../../.test-publish/build/index.integration-with-mock.js'),
  setup: async () => {
    const rootDir = path.join(__dirname, '../..');
    const localDir = path.join(rootDir, 'local');
    const testPublishDir = path.join(rootDir, '.test-publish');

    console.log('\n🧪 Setting up built mode testing...');

    // Clean up any previous test publish directory
    if (existsSync(testPublishDir)) {
      console.log('Cleaning up previous test publish directory...');
      await rm(testPublishDir, { recursive: true, force: true });
    }

    console.log('Creating test publish directory...');
    try {
      // Copy the local directory to test publish directory
      await cp(localDir, testPublishDir, {
        recursive: true,
        filter: (src) => {
          // Skip node_modules, build output, and symlinks
          const basename = path.basename(src);
          return (
            !basename.includes('node_modules') &&
            !basename.includes('build') &&
            !basename.includes('shared')
          ); // Skip the symlink
        },
      });

      // Simulate the CI publish process
      console.log('Simulating CI publish process...');

      // First, run ci:install if available
      try {
        execSync('npm run --silent ci:install', {
          cwd: testPublishDir,
          stdio: 'inherit',
        });
      } catch {
        console.log('No ci:install script, using npm install');
        execSync('npm install', {
          cwd: testPublishDir,
          stdio: 'inherit',
        });
      }

      // The prepublishOnly hook will run prepare-publish.js
      // We'll run it directly to simulate the publish process
      console.log('Running prepare-publish.js...');
      execSync('node prepare-publish.js', {
        cwd: testPublishDir,
        stdio: 'inherit',
      });

      console.log('✅ Built mode setup complete!');
    } catch (error) {
      console.error('❌ Failed to setup built mode:', error);
      throw error;
    }
  },
});
