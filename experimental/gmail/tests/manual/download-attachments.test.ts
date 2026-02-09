import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, rm, stat } from 'fs/promises';
import { createDefaultClient, type IGmailClient } from '../../shared/src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * End-to-end manual tests for the download_email_attachments MCP tool.
 *
 * Tests the full flow: MCP tool call → Gmail API → file written to /tmp/ → file verified on disk.
 *
 * Prerequisites:
 *   - .env with Gmail service account or OAuth2 credentials
 *   - At least one email with an attachment in the test account
 */
describe('download_email_attachments - E2E Manual Tests', () => {
  let mcpClient: TestMCPClient;
  let gmailClient: IGmailClient;
  let emailIdWithAttachment: string;
  let expectedAttachmentFilename: string;
  let expectedAttachmentId: string;

  beforeAll(async () => {
    // Connect to the real MCP server (built code, real Gmail API)
    mcpClient = new TestMCPClient({
      serverPath: join(__dirname, '../../local/build/index.js'),
      env: {
        ...process.env,
      },
    });
    await mcpClient.connect();

    // Also create a direct client for cross-validation
    gmailClient = createDefaultClient();

    // Find an email with attachments to use in all tests
    const listResult = await gmailClient.listMessages({
      q: 'has:attachment',
      maxResults: 10,
    });

    expect(
      listResult.messages.length,
      'No emails with attachments found in test account - this test requires at least one email with an attachment'
    ).toBeGreaterThan(0);

    // Find the first email that has a downloadable attachment
    for (const msg of listResult.messages) {
      const message = await gmailClient.getMessage(msg.id, { format: 'full' });
      const attachment = findFirstAttachment(message.payload);
      if (attachment) {
        emailIdWithAttachment = msg.id;
        expectedAttachmentFilename = attachment.filename;
        expectedAttachmentId = attachment.attachmentId;
        console.log(
          `Using email ${msg.id} with attachment "${attachment.filename}" (${attachment.size} bytes)`
        );
        break;
      }
    }

    expect(
      emailIdWithAttachment,
      'Checked 10 emails with has:attachment query but none had downloadable attachment parts'
    ).toBeDefined();
  });

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.disconnect();
    }

    // Clean up the /tmp/ directory created by the tool
    if (emailIdWithAttachment) {
      const safeId = emailIdWithAttachment.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dir = join('/tmp', `gmail-attachments-${safeId}`);
      await rm(dir, { recursive: true, force: true }).catch(() => {
        /* ignore if doesn't exist */
      });
    }
  });

  it('should save attachment to /tmp/ and return file path', async () => {
    const result = await mcpClient.callTool('download_email_attachments', {
      email_id: emailIdWithAttachment,
      filename: expectedAttachmentFilename,
    });

    expect(result.isError).toBe(false);

    const text = (result.content[0] as { text: string }).text;
    console.log('Tool response:\n', text);

    // Response should contain the file path
    expect(text).toContain('/tmp/gmail-attachments-');
    expect(text).toContain(expectedAttachmentFilename);

    // Extract the file path from the response
    const pathMatch = text.match(/`(\/tmp\/gmail-attachments-[^`]+)`/);
    expect(pathMatch, 'Could not find file path in tool response').toBeTruthy();

    const filePath = pathMatch![1];

    // Verify the file actually exists on disk
    const fileStat = await stat(filePath);
    expect(fileStat.isFile()).toBe(true);
    expect(fileStat.size).toBeGreaterThan(0);
    console.log(`File exists at ${filePath}, size: ${fileStat.size} bytes`);
  });

  it('should produce an uncorrupted file matching direct API download', async () => {
    // Step 1: Download via MCP tool (saves to /tmp/)
    const toolResult = await mcpClient.callTool('download_email_attachments', {
      email_id: emailIdWithAttachment,
      filename: expectedAttachmentFilename,
    });

    expect(toolResult.isError).toBe(false);

    const text = (toolResult.content[0] as { text: string }).text;
    const pathMatch = text.match(/`(\/tmp\/gmail-attachments-[^`]+)`/);
    expect(pathMatch).toBeTruthy();

    const savedFilePath = pathMatch![1];
    const savedFileContent = await readFile(savedFilePath);

    // Step 2: Download the same attachment directly via the API client
    const directDownload = await gmailClient.getAttachment(
      emailIdWithAttachment,
      expectedAttachmentId
    );

    // Decode the base64url data from the API
    const base64Standard = directDownload.data.replace(/-/g, '+').replace(/_/g, '/');
    const directContent = Buffer.from(base64Standard, 'base64');

    // Step 3: Compare - the file saved by the tool should exactly match the direct download
    expect(savedFileContent.length).toBe(directContent.length);
    expect(savedFileContent.equals(directContent)).toBe(true);

    console.log(
      `File integrity verified: ${savedFileContent.length} bytes, ` +
        `saved file matches direct API download byte-for-byte`
    );
  });

  it('should return inline content when inline=true', async () => {
    const result = await mcpClient.callTool('download_email_attachments', {
      email_id: emailIdWithAttachment,
      filename: expectedAttachmentFilename,
      inline: true,
    });

    expect(result.isError).toBe(false);

    const text = (result.content[0] as { text: string }).text;

    // Inline response should contain the filename and content
    expect(text).toContain(expectedAttachmentFilename);
    expect(text).toContain('# Downloaded Attachments');

    // Should NOT contain /tmp/ paths (inline mode returns content, not files)
    expect(text).not.toContain('/tmp/gmail-attachments-');

    console.log(
      `Inline mode response length: ${text.length} chars for "${expectedAttachmentFilename}"`
    );
  });

  it('should download all attachments when no filename specified', async () => {
    const result = await mcpClient.callTool('download_email_attachments', {
      email_id: emailIdWithAttachment,
    });

    expect(result.isError).toBe(false);

    const text = (result.content[0] as { text: string }).text;

    // Should contain the heading and file paths
    expect(text).toContain('# Downloaded Attachments');
    expect(text).toContain('Saved Files');
    expect(text).toContain('/tmp/gmail-attachments-');

    // Extract all file paths from the response
    const pathMatches = [...text.matchAll(/`(\/tmp\/gmail-attachments-[^`]+)`/g)];
    expect(pathMatches.length).toBeGreaterThan(0);

    // Verify each file exists on disk and is non-empty
    for (const match of pathMatches) {
      const filePath = match[1];
      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.size).toBeGreaterThan(0);
      console.log(`  Verified: ${filePath} (${fileStat.size} bytes)`);
    }

    console.log(`All ${pathMatches.length} attachment(s) saved and verified on disk`);
  });
});

/**
 * Recursively find the first attachment in an email payload.
 */
function findFirstAttachment(
  payload:
    | {
        filename?: string;
        mimeType: string;
        body?: { attachmentId?: string; size: number };
        parts?: (typeof payload)[];
      }
    | undefined
): { filename: string; attachmentId: string; size: number } | null {
  if (!payload) return null;

  // Check payload-level attachment
  if (payload.filename && payload.body?.attachmentId) {
    return {
      filename: payload.filename,
      attachmentId: payload.body.attachmentId,
      size: payload.body.size,
    };
  }

  // Check nested parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        return {
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          size: part.body.size,
        };
      }
      if (part.parts) {
        const nested = findFirstAttachment(part);
        if (nested) return nested;
      }
    }
  }

  return null;
}
