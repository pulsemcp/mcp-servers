import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Tool {
  name: string;
  inputSchema: {
    required?: string[];
    properties?: Record<string, unknown>;
  };
}

describe('Fetch Pet MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    // Create test client using the mock integration entry point
    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        // No credentials needed for mock mode
      },
      debug: false,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect successfully', () => {
      expect(client).toBeDefined();
    });
  });

  describe('Tool Listing', () => {
    it('should list all available tools', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('prepare_claim_to_submit');
      expect(toolNames).toContain('submit_claim');
      expect(toolNames).toContain('get_claims');
      expect(toolNames).toContain('get_claim_details');
    });

    it('should have 4 tools total', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      expect(tools.length).toBe(4);
    });
  });

  describe('Tool Schemas', () => {
    it('prepare_claim_to_submit should have required parameters', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const prepareTool = tools.find((t) => t.name === 'prepare_claim_to_submit');

      expect(prepareTool).toBeDefined();
      expect(prepareTool!.inputSchema.required).toContain('pet_name');
      expect(prepareTool!.inputSchema.required).toContain('invoice_date');
      expect(prepareTool!.inputSchema.required).toContain('invoice_amount');
      expect(prepareTool!.inputSchema.required).toContain('provider_name');
      expect(prepareTool!.inputSchema.required).toContain('claim_description');
    });

    it('submit_claim should require confirmation_token', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const submitTool = tools.find((t) => t.name === 'submit_claim');

      expect(submitTool).toBeDefined();
      expect(submitTool!.inputSchema.required).toContain('confirmation_token');
    });

    it('get_claim_details should require claim_id', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const detailsTool = tools.find((t) => t.name === 'get_claim_details');

      expect(detailsTool).toBeDefined();
      expect(detailsTool!.inputSchema.required).toContain('claim_id');
    });

    it('get_claims should have no required parameters', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const claimsTool = tools.find((t) => t.name === 'get_claims');

      expect(claimsTool).toBeDefined();
      expect(claimsTool!.inputSchema.required).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    it('should get claims', async () => {
      const result = await client.callTool('get_claims', {});

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      expect(content.text).toContain('claim');
    });

    it('should get claim details', async () => {
      const result = await client.callTool('get_claim_details', {
        claim_id: 'TEST-001',
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      expect(content.text).toContain('Claim Details');
    });

    it('should prepare a claim', async () => {
      const result = await client.callTool('prepare_claim_to_submit', {
        pet_name: 'Buddy',
        invoice_date: '2025-01-15',
        invoice_amount: '$150.00',
        provider_name: 'Test Vet',
        claim_description: 'Annual checkup',
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      expect(content.text).toContain('prepared but NOT submitted');
      expect(content.text).toContain('confirmation_token');
    });

    it('should reject submit with invalid token', async () => {
      const result = await client.callTool('submit_claim', {
        confirmation_token: 'invalid-token',
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      expect(content.text).toContain('Invalid');
    });
  });
});
