import { symlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDev() {
  const linkPath = join(__dirname, 'shared');
  const targetPath = join(__dirname, '../shared/dist');

  try {
    await symlink(targetPath, linkPath, 'dir');
    console.log('Created symlink for development');
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log('Symlink already exists');
    } else {
      console.error('Failed to create symlink:', error.message);
      process.exit(1);
    }
  }
}

setupDev();
