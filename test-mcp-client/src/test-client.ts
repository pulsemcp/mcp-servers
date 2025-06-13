import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ListResourcesResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TestMCPClientOptions, ToolCallResult, ResourceReadResult } from './types.js';

export class TestMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private options: TestMCPClientOptions;
  private connected: boolean = false;

  constructor(options: TestMCPClientOptions) {
    this.options = options;
    this.client = new Client(
      {
        name: 'test-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Client is already connected');
    }

    this.transport = new StdioClientTransport({
      command: process.execPath || 'node',
      args: [this.options.serverPath, ...(this.options.serverArgs || [])],
      env: this.options.env,
    });

    if (this.options.debug) {
      this.transport.onerror = (error) => {
        console.error('[TestMCPClient] Transport error:', error);
      };
    }

    await this.client.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
  }

  async listTools(): Promise<typeof ListToolsResultSchema._type> {
    this.ensureConnected();
    return await this.client.listTools();
  }

  async callTool<T = any>(
    name: string,
    args: Record<string, any> = {}
  ): Promise<ToolCallResult<T>> {
    this.ensureConnected();

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    return {
      content: result.content as T[],
      isError: result.isError === true,
    };
  }

  async listResources(): Promise<typeof ListResourcesResultSchema._type> {
    this.ensureConnected();
    return await this.client.listResources();
  }

  async readResource<T = any>(uri: string): Promise<ResourceReadResult<T>> {
    this.ensureConnected();

    const result = await this.client.readResource({
      uri,
    });

    return {
      contents: result.contents as T[],
    };
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client is not connected. Call connect() first.');
    }
  }
}
