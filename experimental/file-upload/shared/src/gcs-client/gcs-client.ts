import { Storage } from '@google-cloud/storage';
import type { GCSConfig, UploadResult, UploadOptions } from '../types.js';

/**
 * Interface for GCS operations
 */
export interface IGCSClient {
  /**
   * Upload data to GCS
   * @param data - Buffer or base64 string to upload
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Upload a file from disk to GCS
   * @param filePath - Path to the file on disk
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Get the configuration
   */
  getConfig(): GCSConfig;
}

/**
 * GCS client implementation
 */
export class GCSClient implements IGCSClient {
  private storage: Storage;
  private config: GCSConfig;

  constructor(config: GCSConfig) {
    this.config = config;

    const storageOptions: ConstructorParameters<typeof Storage>[0] = {};

    if (config.projectId) {
      storageOptions.projectId = config.projectId;
    }

    if (config.keyFilename) {
      storageOptions.keyFilename = config.keyFilename;
    }

    this.storage = new Storage(storageOptions);
  }

  async upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult> {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

    const filename = options?.filename || this.generateFilename(options?.contentType);
    const fullPath = this.config.basePath ? `${this.config.basePath}${filename}` : filename;
    const contentType = options?.contentType || this.inferContentType(filename);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: options?.metadata,
      },
      resumable: false, // Small files don't need resumable uploads
    });

    if (this.config.makePublic) {
      await file.makePublic();
    }

    const url = this.config.makePublic
      ? `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`
      : await this.getSignedUrl(file);

    return {
      url,
      bucket: this.config.bucket,
      path: fullPath,
      size: buffer.length,
      contentType,
    };
  }

  async uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const buffer = await fs.readFile(filePath);
    const filename = options?.filename || path.basename(filePath);
    const contentType = options?.contentType || this.inferContentType(filename);

    return this.upload(buffer, {
      ...options,
      filename,
      contentType,
    });
  }

  getConfig(): GCSConfig {
    return this.config;
  }

  private generateFilename(contentType?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getExtensionForContentType(contentType);
    return `upload-${timestamp}${extension}`;
  }

  private getExtensionForContentType(contentType?: string): string {
    if (!contentType) return '';

    const extensions: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json',
    };

    return extensions[contentType] || '';
  }

  private inferContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      html: 'text/html',
      json: 'application/json',
    };

    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  private async getSignedUrl(
    file: ReturnType<ReturnType<typeof Storage.prototype.bucket>['file']>
  ): Promise<string> {
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return url;
  }
}
