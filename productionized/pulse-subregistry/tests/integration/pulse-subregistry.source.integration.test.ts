import path from 'path';
import { fileURLToPath } from 'url';
import { runIntegrationTests } from './test-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run tests in source mode
runIntegrationTests({
  name: 'SOURCE',
  serverPath: path.join(__dirname, '../../local/build/index.integration-with-mock.js'),
});
