import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for PulseMCP CMS Admin MCP Server - send email functionality
 *
 * Prerequisites:
 * - PULSEMCP_ADMIN_API_KEY environment variable set
 * - Optionally PULSEMCP_ADMIN_API_URL for custom API endpoint
 *
 * Run with: npm run test:manual
 */
describe('send-email manual tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const apiKey = process.env.PULSEMCP_ADMIN_API_KEY;
    if (!apiKey) {
      throw new Error('PULSEMCP_ADMIN_API_KEY environment variable is required');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      PULSEMCP_ADMIN_API_KEY: apiKey,
    };

    if (process.env.PULSEMCP_ADMIN_API_URL) {
      env.PULSEMCP_ADMIN_API_URL = process.env.PULSEMCP_ADMIN_API_URL;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should send a test email to specified recipient', async () => {
    const result = await client.callTool('send_impl_posted_notif', {
      implementation_id: 11371,
      from_email_address: 'tadas@s.pulsemcp.com',
      from_name: 'Tadas at PulseMCP',
      reply_to_email_address: 'tadas@pulsemcp.com',
      to_email_address: 'tadas412@gmail.com',
      content: `This is a test email sent from the PulseMCP CMS Admin MCP server manual test suite.

This email was sent at: ${new Date().toISOString()}

The purpose of this test is to verify that the email sending functionality is working correctly through the MCP server.

Best regards,
PulseMCP Team`,
    });
    expect(result.isError).toBeFalsy();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toBeDefined();
    console.log(`send email response: ${text}`);
  });
});
