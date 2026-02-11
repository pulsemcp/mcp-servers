import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for remote-filesystem MCP server.
 * Run with: npm run test:manual
 *
 * Required environment variables:
 * - GCS_BUCKET: Target bucket name
 *
 * One of:
 * - GCS_CLIENT_EMAIL + GCS_PRIVATE_KEY: Inline service account credentials
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key file
 *
 * Optional:
 * - GCS_PROJECT_ID: Google Cloud project ID
 * - GCS_ROOT_PATH: Root path prefix for all operations
 */
describe('remote-filesystem MCP Server - Manual Tests', () => {
  let client: TestMCPClient;
  const testPrefix = `manual-tests/${Date.now()}/`;
  const uploadedFiles: string[] = [];

  beforeAll(async () => {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new Error('GCS_BUCKET environment variable is required');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      GCS_BUCKET: bucket,
      GCS_ROOT_PATH: testPrefix,
      GCS_MAKE_PUBLIC: 'false',
    };

    if (process.env.GCS_PROJECT_ID) {
      env.GCS_PROJECT_ID = process.env.GCS_PROJECT_ID;
    }
    if (process.env.GCS_CLIENT_EMAIL) {
      env.GCS_CLIENT_EMAIL = process.env.GCS_CLIENT_EMAIL;
    }
    if (process.env.GCS_PRIVATE_KEY) {
      env.GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    // Clean up uploaded files
    for (const filePath of uploadedFiles) {
      try {
        await client.callTool('delete_file', { path: filePath });
        console.log(`Cleaned up: ${filePath}`);
      } catch {
        console.log(`Could not clean up: ${filePath}`);
      }
    }

    if (client) {
      await client.disconnect();
    }
  });

  describe('upload', () => {
    it('should upload PNG image from base64', async () => {
      // 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await client.callTool('upload', {
        source: pngBase64,
        path: 'test-image.png',
        contentType: 'image/png',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('test-image.png');

      expect(parsed.url).toContain('storage.googleapis.com');
      expect(parsed.contentType).toBe('image/png');
      expect(parsed.size).toBeGreaterThan(0);
      expect(parsed.isPublic).toBe(false);

      console.log('Uploaded PNG:', parsed);
    });

    it('should upload text file from base64', async () => {
      const textContent = 'Hello, this is a test file!';
      const base64 = Buffer.from(textContent).toString('base64');

      const result = await client.callTool('upload', {
        source: base64,
        path: 'test-text.txt',
        contentType: 'text/plain',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('test-text.txt');

      expect(parsed.url).toContain('storage.googleapis.com');
      expect(parsed.contentType).toBe('text/plain');

      console.log('Uploaded text:', parsed);
    });

    it('should upload file as public when specified', async () => {
      const textContent = 'Public test file';
      const base64 = Buffer.from(textContent).toString('base64');

      const result = await client.callTool('upload', {
        source: base64,
        path: 'public-test.txt',
        contentType: 'text/plain',
        makePublic: true,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('public-test.txt');

      expect(parsed.isPublic).toBe(true);
      expect(parsed.url).not.toContain('X-Goog-Signature');

      console.log('Uploaded public file:', parsed);
    });
  });

  describe('download', () => {
    it('should download text file as string', async () => {
      const originalContent = 'Download test content';
      const base64 = Buffer.from(originalContent).toString('base64');

      // Upload first
      const uploadResult = await client.callTool('upload', {
        source: base64,
        path: 'download-test.txt',
        contentType: 'text/plain',
      });
      expect(uploadResult.isError).toBeFalsy();
      uploadedFiles.push('download-test.txt');

      // Download
      const downloadResult = await client.callTool('download', {
        path: 'download-test.txt',
      });
      expect(downloadResult.isError).toBeFalsy();

      const parsed = JSON.parse(downloadResult.content[0].text);
      expect(parsed.content).toBe(originalContent);
      expect(parsed.info.contentType).toBe('text/plain');

      console.log('Downloaded text:', parsed);
    });

    it('should download binary file as base64', async () => {
      // 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const uploadResult = await client.callTool('upload', {
        source: pngBase64,
        path: 'download-test.png',
        contentType: 'image/png',
      });
      expect(uploadResult.isError).toBeFalsy();
      uploadedFiles.push('download-test.png');

      const downloadResult = await client.callTool('download', {
        path: 'download-test.png',
        asBase64: true,
      });
      expect(downloadResult.isError).toBeFalsy();

      const parsed = JSON.parse(downloadResult.content[0].text);
      expect(parsed.content).toBe(pngBase64);
      expect(parsed.info.contentType).toBe('image/png');

      console.log('Downloaded binary as base64:', parsed);
    });
  });

  describe('list', () => {
    it('should list files in directory', async () => {
      // Upload a few test files for listing
      const upload1 = await client.callTool('upload', {
        source: Buffer.from('list test 1').toString('base64'),
        path: 'list-test/file1.txt',
      });
      expect(upload1.isError).toBeFalsy();
      uploadedFiles.push('list-test/file1.txt');

      const upload2 = await client.callTool('upload', {
        source: Buffer.from('list test 2').toString('base64'),
        path: 'list-test/file2.txt',
      });
      expect(upload2.isError).toBeFalsy();
      uploadedFiles.push('list-test/file2.txt');

      const result = await client.callTool('list_files', {
        prefix: 'list-test/',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.files.length).toBeGreaterThanOrEqual(2);
      expect(parsed.files.some((f: { path: string }) => f.path.includes('file1.txt'))).toBe(true);
      expect(parsed.files.some((f: { path: string }) => f.path.includes('file2.txt'))).toBe(true);

      console.log('Listed files:', parsed);
    });

    it('should list directories', async () => {
      // Create files in subdirectories
      const upload1 = await client.callTool('upload', {
        source: Buffer.from('subdir test').toString('base64'),
        path: 'subdir-test/subdir1/file.txt',
      });
      expect(upload1.isError).toBeFalsy();
      uploadedFiles.push('subdir-test/subdir1/file.txt');

      const upload2 = await client.callTool('upload', {
        source: Buffer.from('subdir test 2').toString('base64'),
        path: 'subdir-test/subdir2/file.txt',
      });
      expect(upload2.isError).toBeFalsy();
      uploadedFiles.push('subdir-test/subdir2/file.txt');

      const result = await client.callTool('list_files', {
        prefix: 'subdir-test/',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.directories.length).toBeGreaterThanOrEqual(2);

      console.log('Listed directories:', parsed);
    });
  });

  describe('modify', () => {
    it('should make file public', async () => {
      const uploadResult = await client.callTool('upload', {
        source: Buffer.from('modify test').toString('base64'),
        path: 'modify-test.txt',
      });
      expect(uploadResult.isError).toBeFalsy();
      uploadedFiles.push('modify-test.txt');

      const uploadParsed = JSON.parse(uploadResult.content[0].text);
      expect(uploadParsed.isPublic).toBe(false);

      const modifyResult = await client.callTool('modify', {
        path: 'modify-test.txt',
        makePublic: true,
      });
      expect(modifyResult.isError).toBeFalsy();

      const modifiedParsed = JSON.parse(modifyResult.content[0].text);
      expect(modifiedParsed.isPublic).toBe(true);
      expect(modifiedParsed.url).not.toContain('X-Goog-Signature');

      console.log('Made file public:', modifiedParsed);
    });

    it('should make file private', async () => {
      const uploadResult = await client.callTool('upload', {
        source: Buffer.from('private test').toString('base64'),
        path: 'private-test.txt',
        makePublic: true,
      });
      expect(uploadResult.isError).toBeFalsy();
      uploadedFiles.push('private-test.txt');

      const uploadParsed = JSON.parse(uploadResult.content[0].text);
      expect(uploadParsed.isPublic).toBe(true);

      const modifyResult = await client.callTool('modify', {
        path: 'private-test.txt',
        makePrivate: true,
      });
      expect(modifyResult.isError).toBeFalsy();

      const modifiedParsed = JSON.parse(modifyResult.content[0].text);
      expect(modifiedParsed.isPublic).toBe(false);
      // Private files use signed URLs with Signature query parameter
      expect(modifiedParsed.url).toContain('Signature=');

      console.log('Made file private:', modifiedParsed);
    });

    it('should update content type', async () => {
      const uploadResult = await client.callTool('upload', {
        source: Buffer.from('type test').toString('base64'),
        path: 'type-test.txt',
        contentType: 'text/plain',
      });
      expect(uploadResult.isError).toBeFalsy();
      uploadedFiles.push('type-test.txt');

      const modifyResult = await client.callTool('modify', {
        path: 'type-test.txt',
        contentType: 'application/octet-stream',
      });
      expect(modifyResult.isError).toBeFalsy();

      const modifiedParsed = JSON.parse(modifyResult.content[0].text);
      expect(modifiedParsed.contentType).toBe('application/octet-stream');

      console.log('Updated content type:', modifiedParsed);
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      // Upload a file to delete
      const uploadResult = await client.callTool('upload', {
        source: Buffer.from('delete test').toString('base64'),
        path: 'delete-test.txt',
      });
      expect(uploadResult.isError).toBeFalsy();

      // Don't add to uploadedFiles since we're deleting it

      // Verify the file exists by downloading it
      const downloadResult = await client.callTool('download', {
        path: 'delete-test.txt',
      });
      expect(downloadResult.isError).toBeFalsy();

      // Delete the file
      const deleteResult = await client.callTool('delete_file', {
        path: 'delete-test.txt',
      });
      expect(deleteResult.isError).toBeFalsy();

      const deleteParsed = JSON.parse(deleteResult.content[0].text);
      expect(deleteParsed.success).toBe(true);

      console.log('Deleted file successfully');
    });
  });

  describe('content type detection', () => {
    it('should detect PNG content type from path', async () => {
      const data = Buffer.from('fake png data').toString('base64');

      const result = await client.callTool('upload', {
        source: data,
        path: 'type-detect.png',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('type-detect.png');

      expect(parsed.contentType).toBe('image/png');
    });

    it('should detect JPEG content type from path', async () => {
      const data = Buffer.from('fake jpeg data').toString('base64');

      const result = await client.callTool('upload', {
        source: data,
        path: 'type-detect.jpg',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('type-detect.jpg');

      expect(parsed.contentType).toBe('image/jpeg');
    });

    it('should use provided content type over detection', async () => {
      const data = Buffer.from('test data').toString('base64');

      const result = await client.callTool('upload', {
        source: data,
        path: 'override-type.txt',
        contentType: 'application/octet-stream',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      uploadedFiles.push('override-type.txt');

      expect(parsed.contentType).toBe('application/octet-stream');
    });
  });
});
