import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GCSClient } from '../../shared/src/gcs-client/gcs-client.js';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
describe('remote-filesystem manual tests', () => {
  let client: GCSClient;
  let tempDir: string;
  const testPrefix = `manual-tests/${Date.now()}/`;
  const uploadedFiles: string[] = [];

  beforeAll(() => {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new Error('GCS_BUCKET environment variable is required for manual tests');
    }

    client = new GCSClient({
      bucket,
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      clientEmail: process.env.GCS_CLIENT_EMAIL,
      privateKey: process.env.GCS_PRIVATE_KEY,
      rootPath: testPrefix,
      makePublic: false, // Default to private for tests
    });

    tempDir = mkdtempSync(join(tmpdir(), 'remote-fs-test-'));
  });

  afterAll(async () => {
    // Clean up uploaded files
    for (const path of uploadedFiles) {
      try {
        await client.delete(path);
        console.log(`Cleaned up: ${path}`);
      } catch {
        console.log(`Could not clean up: ${path}`);
      }
    }
  });

  describe('upload', () => {
    it('should upload PNG image from base64', async () => {
      // 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await client.upload(pngBase64, {
        path: `test-image.png`,
        contentType: 'image/png',
      });

      uploadedFiles.push(result.path);

      expect(result.url).toContain('storage.googleapis.com');
      expect(result.contentType).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
      expect(result.isPublic).toBe(false);

      console.log('Uploaded PNG:', result);
    });

    it('should upload text file from base64', async () => {
      const textContent = 'Hello, this is a test file!';
      const base64 = Buffer.from(textContent).toString('base64');

      const result = await client.upload(base64, {
        path: `test-text.txt`,
        contentType: 'text/plain',
      });

      uploadedFiles.push(result.path);

      expect(result.url).toContain('storage.googleapis.com');
      expect(result.contentType).toBe('text/plain');

      console.log('Uploaded text:', result);
    });

    it('should upload file as public when specified', async () => {
      const textContent = 'Public test file';
      const base64 = Buffer.from(textContent).toString('base64');

      const result = await client.upload(base64, {
        path: `public-test.txt`,
        contentType: 'text/plain',
        makePublic: true,
      });

      uploadedFiles.push(result.path);

      expect(result.isPublic).toBe(true);
      expect(result.url).not.toContain('X-Goog-Signature');

      console.log('Uploaded public file:', result);
    });
  });

  describe('uploadFile', () => {
    it('should upload file from disk', async () => {
      const tempFile = join(tempDir, `test-${Date.now()}.txt`);
      writeFileSync(tempFile, 'Test content from file');

      try {
        const result = await client.uploadFile(tempFile, {
          path: 'from-disk.txt',
        });

        uploadedFiles.push(result.path);

        expect(result.url).toContain('storage.googleapis.com');
        expect(result.size).toBeGreaterThan(0);

        console.log('Uploaded from disk:', result);
      } finally {
        unlinkSync(tempFile);
      }
    });
  });

  describe('download', () => {
    it('should download text file as string', async () => {
      const originalContent = 'Download test content';
      const base64 = Buffer.from(originalContent).toString('base64');

      const uploadResult = await client.upload(base64, {
        path: 'download-test.txt',
        contentType: 'text/plain',
      });

      uploadedFiles.push(uploadResult.path);

      const downloadResult = await client.download('download-test.txt');

      expect(downloadResult.content).toBe(originalContent);
      expect(downloadResult.info.contentType).toBe('text/plain');

      console.log('Downloaded text:', downloadResult);
    });

    it('should download binary file as base64', async () => {
      // 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await client.upload(pngBase64, {
        path: 'download-test.png',
        contentType: 'image/png',
      });

      uploadedFiles.push('download-test.png');

      const downloadResult = await client.download('download-test.png', { asBase64: true });

      expect(downloadResult.content).toBe(pngBase64);
      expect(downloadResult.info.contentType).toBe('image/png');

      console.log('Downloaded binary as base64:', downloadResult);
    });
  });

  describe('list', () => {
    it('should list files in directory', async () => {
      // Upload a few test files for listing
      const file1 = await client.upload(Buffer.from('list test 1').toString('base64'), {
        path: 'list-test/file1.txt',
      });
      const file2 = await client.upload(Buffer.from('list test 2').toString('base64'), {
        path: 'list-test/file2.txt',
      });
      uploadedFiles.push(file1.path, file2.path);

      const result = await client.list({ prefix: 'list-test/' });

      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(result.files.some((f) => f.path.includes('file1.txt'))).toBe(true);
      expect(result.files.some((f) => f.path.includes('file2.txt'))).toBe(true);

      console.log('Listed files:', result);
    });

    it('should list directories', async () => {
      // Create files in subdirectories
      const file1 = await client.upload(Buffer.from('subdir test').toString('base64'), {
        path: 'subdir-test/subdir1/file.txt',
      });
      const file2 = await client.upload(Buffer.from('subdir test 2').toString('base64'), {
        path: 'subdir-test/subdir2/file.txt',
      });
      uploadedFiles.push(file1.path, file2.path);

      const result = await client.list({ prefix: 'subdir-test/' });

      expect(result.directories.length).toBeGreaterThanOrEqual(2);

      console.log('Listed directories:', result);
    });
  });

  describe('getInfo', () => {
    it('should get file info', async () => {
      const uploadResult = await client.upload(Buffer.from('info test').toString('base64'), {
        path: 'info-test.txt',
        contentType: 'text/plain',
      });

      uploadedFiles.push(uploadResult.path);

      const info = await client.getInfo('info-test.txt');

      expect(info.path).toBe('info-test.txt');
      expect(info.contentType).toBe('text/plain');
      expect(info.size).toBeGreaterThan(0);

      console.log('File info:', info);
    });
  });

  describe('modify', () => {
    it('should make file public', async () => {
      const uploadResult = await client.upload(Buffer.from('modify test').toString('base64'), {
        path: 'modify-test.txt',
      });

      uploadedFiles.push(uploadResult.path);

      expect(uploadResult.isPublic).toBe(false);

      const modifiedInfo = await client.modify('modify-test.txt', { makePublic: true });

      expect(modifiedInfo.isPublic).toBe(true);
      expect(modifiedInfo.url).not.toContain('X-Goog-Signature');

      console.log('Made file public:', modifiedInfo);
    });

    it('should make file private', async () => {
      const uploadResult = await client.upload(Buffer.from('private test').toString('base64'), {
        path: 'private-test.txt',
        makePublic: true,
      });

      uploadedFiles.push(uploadResult.path);

      expect(uploadResult.isPublic).toBe(true);

      const modifiedInfo = await client.modify('private-test.txt', { makePrivate: true });

      expect(modifiedInfo.isPublic).toBe(false);
      expect(modifiedInfo.url).toContain('X-Goog-Signature');

      console.log('Made file private:', modifiedInfo);
    });

    it('should update content type', async () => {
      const uploadResult = await client.upload(Buffer.from('type test').toString('base64'), {
        path: 'type-test.txt',
        contentType: 'text/plain',
      });

      uploadedFiles.push(uploadResult.path);

      const modifiedInfo = await client.modify('type-test.txt', {
        contentType: 'application/octet-stream',
      });

      expect(modifiedInfo.contentType).toBe('application/octet-stream');

      console.log('Updated content type:', modifiedInfo);
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      await client.upload(Buffer.from('delete test').toString('base64'), {
        path: 'delete-test.txt',
      });

      // Don't add to uploadedFiles since we're deleting it

      expect(await client.exists('delete-test.txt')).toBe(true);

      await client.delete('delete-test.txt');

      expect(await client.exists('delete-test.txt')).toBe(false);

      console.log('Deleted file successfully');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const uploadResult = await client.upload(Buffer.from('exists test').toString('base64'), {
        path: 'exists-test.txt',
      });

      uploadedFiles.push(uploadResult.path);

      const exists = await client.exists('exists-test.txt');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await client.exists('non-existent-file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('content type detection', () => {
    it('should detect PNG content type from path', async () => {
      const data = Buffer.from('fake png data').toString('base64');

      const result = await client.upload(data, {
        path: 'type-detect.png',
      });

      uploadedFiles.push(result.path);

      expect(result.contentType).toBe('image/png');
    });

    it('should detect JPEG content type from path', async () => {
      const data = Buffer.from('fake jpeg data').toString('base64');

      const result = await client.upload(data, {
        path: 'type-detect.jpg',
      });

      uploadedFiles.push(result.path);

      expect(result.contentType).toBe('image/jpeg');
    });

    it('should use provided content type over detection', async () => {
      const data = Buffer.from('test data').toString('base64');

      const result = await client.upload(data, {
        path: 'override-type.txt',
        contentType: 'application/octet-stream',
      });

      uploadedFiles.push(result.path);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });
});
