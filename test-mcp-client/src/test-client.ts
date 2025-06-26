import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TestMCPClientOptions, ToolCallResult, ResourceReadResult } from './types.js';

export class TestMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private options: TestMCPClientOptions;
  private connected: boolean = false;
  private listChangedHandler?: (notification: unknown) => void;

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

    // Set up notification handler for list changed notifications
    this.client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
      if (this.listChangedHandler) {
        this.listChangedHandler(notification);
      }
    });

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
    this.listChangedHandler = undefined;
  }

  async listTools(): Promise<typeof ListToolsResultSchema._type> {
    this.ensureConnected();
    return await this.client.listTools();
  }

  async callTool<T = unknown>(
    name: string,
    args: Record<string, unknown> = {}
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

  async readResource<T = unknown>(uri: string): Promise<ResourceReadResult<T>> {
    this.ensureConnected();

    const result = await this.client.readResource({
      uri,
    });

    return {
      contents: result.contents as T[],
    };
  }

  setListChangedHandler(handler: (notification: unknown) => void): void {
    this.listChangedHandler = handler;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client is not connected. Call connect() first.');
    }
  }
}
