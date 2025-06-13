import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MockConfig {
  // Define your mock data structure here
  // Example:
  // items?: Record<string, { id: string; name: string }>;
  [key: string]: unknown;
}

export async function createMockedClient(mockConfig: MockConfig): Promise<TestMCPClient> {
  const client = new TestMCPClient({
    command: 'node',
    args: [path.join(__dirname, '../../local/build/index.integration.js')],
    env: {
      ...process.env,
      MOCK_CONFIG: JSON.stringify(mockConfig),
    },
  });

  await client.connect();
  return client;
}