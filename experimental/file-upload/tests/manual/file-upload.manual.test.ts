import { describe, it, expect, beforeAll } from 'vitest';
import { GCSClient } from '../../shared/src/gcs-client/gcs-client.js';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Manual tests that require real GCS credentials.
 * Run with: npm run test:manual
 *
 * Required environment variables:
 * - GCS_BUCKET: Target bucket name
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key (optional if using ADC)
 */
describe('file-upload manual tests', () => {
  let client: GCSClient;
  let tempDir: string;

  beforeAll(() => {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new Error('GCS_BUCKET environment variable is required for manual tests');
    }

    client = new GCSClient({
      bucket,
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      basePath: 'manual-tests/',
      makePublic: true,
    });

    tempDir = mkdtempSync(join(tmpdir(), 'file-upload-test-'));
  });

  describe('upload base64 data', () => {
    it('should upload PNG image from base64', async () => {
      // 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await client.upload(pngBase64, {
        filename: `test-${Date.now()}.png`,
        contentType: 'image/png',
      });

      expect(result.url).toContain('storage.googleapis.com');
      expect(result.bucket).toBe(process.env.GCS_BUCKET);
      expect(result.contentType).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);

      console.log('Uploaded PNG URL:', result.url);
    });

    it('should upload text file from base64', async () => {
      const textContent = 'Hello, this is a test file!';
      const base64 = Buffer.from(textContent).toString('base64');

      const result = await client.upload(base64, {
        filename: `test-${Date.now()}.txt`,
        contentType: 'text/plain',
      });

      expect(result.url).toContain('storage.googleapis.com');
      expect(result.contentType).toBe('text/plain');

      console.log('Uploaded text URL:', result.url);
    });
  });

  describe('upload from file', () => {
    it('should upload file from disk', async () => {
      // Create a temp file
      const tempFile = join(tempDir, `test-${Date.now()}.txt`);
      writeFileSync(tempFile, 'Test content from file');

      try {
        const result = await client.uploadFile(tempFile);

        expect(result.url).toContain('storage.googleapis.com');
        expect(result.size).toBeGreaterThan(0);

        console.log('Uploaded file URL:', result.url);
      } finally {
        unlinkSync(tempFile);
      }
    });

    it('should upload file with custom filename', async () => {
      const tempFile = join(tempDir, 'original-name.txt');
      writeFileSync(tempFile, 'Test content');

      try {
        const result = await client.uploadFile(tempFile, {
          filename: `custom-${Date.now()}.txt`,
        });

        expect(result.path).toContain('custom-');
        expect(result.path).not.toContain('original-name');

        console.log('Uploaded with custom name:', result.url);
      } finally {
        unlinkSync(tempFile);
      }
    });
  });

  describe('content type detection', () => {
    it('should detect PNG content type from filename', async () => {
      const data = Buffer.from('fake png data').toString('base64');

      const result = await client.upload(data, {
        filename: 'test.png',
      });

      expect(result.contentType).toBe('image/png');
    });

    it('should detect JPEG content type from filename', async () => {
      const data = Buffer.from('fake jpeg data').toString('base64');

      const result = await client.upload(data, {
        filename: 'test.jpg',
      });

      expect(result.contentType).toBe('image/jpeg');
    });

    it('should use provided content type over detection', async () => {
      const data = Buffer.from('test data').toString('base64');

      const result = await client.upload(data, {
        filename: 'test.txt',
        contentType: 'application/octet-stream',
      });

      expect(result.contentType).toBe('application/octet-stream');
    });
  });
});
