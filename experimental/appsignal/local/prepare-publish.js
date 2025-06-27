import { execSync } from 'child_process';

console.log('Preparing for publish...');
execSync('npm run build', { stdio: 'inherit' });
console.log('Build completed for publish');
