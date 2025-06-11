import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import type { Alert, LogEntry } from '../../shared/src/appsignal-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MockDefinitions {
  getAlertDetails?: Record<string, Alert | { error: string }>;
  searchLogs?: Array<{
    query: string;
    response: LogEntry[] | { error: string };
  }>;
  getLogsInDatetimeRange?: Array<{
    start: string;
    end: string;
    response: LogEntry[] | { error: string };
  }>;
}

export class MockedTestMCPClient {
  private client: TestMCPClient;
  private mockConfigPath: string;

  constructor(private mockDefinitions: MockDefinitions = {}) {
    // Create a temporary file for mock configuration
    this.mockConfigPath = path.join(os.tmpdir(), `appsignal-mock-${Date.now()}.json`);
    this.updateMocks(mockDefinitions);
  }

  updateMocks(mockDefinitions: MockDefinitions) {
    this.mockDefinitions = mockDefinitions;
    
    // Convert error objects to Error instances for the mock
    const config: any = {
      getAlertDetails: {},
      searchLogs: [],
      getLogsInDatetimeRange: [],
    };

    if (mockDefinitions.getAlertDetails) {
      for (const [id, response] of Object.entries(mockDefinitions.getAlertDetails)) {
        if ('error' in response) {
          config.getAlertDetails[id] = new Error(response.error);
        } else {
          config.getAlertDetails[id] = response;
        }
      }
    }

    if (mockDefinitions.searchLogs) {
      config.searchLogs = mockDefinitions.searchLogs.map(m => ({
        query: m.query,
        response: 'error' in m.response ? new Error(m.response.error) : m.response,
      }));
    }

    if (mockDefinitions.getLogsInDatetimeRange) {
      config.getLogsInDatetimeRange = mockDefinitions.getLogsInDatetimeRange.map(m => ({
        start: m.start,
        end: m.end,
        response: 'error' in m.response ? new Error(m.response.error) : m.response,
      }));
    }

    // Write to file
    fs.writeFileSync(this.mockConfigPath, JSON.stringify(config, (key, value) => {
      if (value instanceof Error) {
        return { __error: true, message: value.message };
      }
      return value;
    }));
  }

  async connect() {
    const serverPath = path.join(__dirname, '../../local/build/src/index.integration-configurable.js');
    
    this.client = new TestMCPClient({
      serverPath,
      env: {
        APPSIGNAL_API_KEY: 'test-api-key',
        APPSIGNAL_APP_ID: 'test-app-id',
        APPSIGNAL_MOCK_CONFIG_PATH: this.mockConfigPath,
      },
      debug: true,
    });

    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
    
    // Clean up mock config file
    if (fs.existsSync(this.mockConfigPath)) {
      fs.unlinkSync(this.mockConfigPath);
    }
  }

  // Delegate all other methods to the underlying client
  listTools() {
    return this.client.listTools();
  }

  callTool<T = any>(name: string, args: Record<string, any> = {}) {
    return this.client.callTool<T>(name, args);
  }

  listResources() {
    return this.client.listResources();
  }

  readResource<T = any>(uri: string) {
    return this.client.readResource<T>(uri);
  }
}