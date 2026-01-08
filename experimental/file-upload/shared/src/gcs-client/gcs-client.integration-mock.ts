import type { IGCSClient } from './gcs-client.js';
import type { GCSConfig, UploadResult, UploadOptions } from '../types.js';

/**
 * Mock GCS client for integration testing
 * Returns predictable results without actually connecting to GCS
 */
export class MockGCSClient implements IGCSClient {
  private config: GCSConfig;
  private uploadCount = 0;

  constructor(config: GCSConfig) {
    this.config = config;
  }

  async upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult> {
    this.uploadCount++;
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

    const filename = options?.filename || `mock-upload-${this.uploadCount}.png`;
    const fullPath = this.config.basePath ? `${this.config.basePath}${filename}` : filename;
    const contentType = options?.contentType || 'image/png';

    return {
      url: `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`,
      bucket: this.config.bucket,
      path: fullPath,
      size: buffer.length,
      contentType,
    };
  }

  async uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const path = await import('path');
    const filename = options?.filename || path.basename(filePath);

    // For mock, we don't actually read the file - just return mock data
    return this.upload(Buffer.from('mock-file-content'), {
      ...options,
      filename,
    });
  }

  getConfig(): GCSConfig {
    return this.config;
  }
}
