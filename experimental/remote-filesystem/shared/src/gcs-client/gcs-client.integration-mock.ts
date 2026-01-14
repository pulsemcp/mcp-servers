import type { IGCSClient } from './gcs-client.js';
import type {
  GCSConfig,
  UploadResult,
  UploadOptions,
  FileInfo,
  ListResult,
  ListOptions,
  DownloadOptions,
  ModifyOptions,
} from '../types.js';

/**
 * Mock GCS client for integration testing
 * Returns predictable results without actually connecting to GCS
 */
export class MockGCSClient implements IGCSClient {
  private config: GCSConfig;
  private uploadCount = 0;
  private files: Map<string, { content: Buffer; info: FileInfo }> = new Map();

  constructor(config: GCSConfig) {
    this.config = config;
  }

  async upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult> {
    this.uploadCount++;
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

    const path = options?.path || `mock-upload-${this.uploadCount}.png`;
    const fullPath = this.config.rootPath ? `${this.config.rootPath}/${path}` : path;
    const contentType = options?.contentType || 'image/png';
    const isPublic = options?.makePublic ?? this.config.makePublic ?? false;

    const fileInfo: FileInfo = {
      path,
      size: buffer.length,
      contentType,
      updatedAt: new Date().toISOString(),
      isPublic,
      url: isPublic
        ? `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`
        : `https://storage.googleapis.com/${this.config.bucket}/${fullPath}?X-Goog-Signature=mock`,
    };

    this.files.set(path, { content: buffer, info: fileInfo });

    return fileInfo;
  }

  async uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const nodePath = await import('path');
    const path = options?.path || nodePath.basename(filePath);

    // For mock, we don't actually read the file - just return mock data
    return this.upload(Buffer.from('mock-file-content'), {
      ...options,
      path,
    });
  }

  async download(
    path: string,
    options?: DownloadOptions
  ): Promise<{ content: string; info: FileInfo }> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    return {
      content: options?.asBase64 ? file.content.toString('base64') : file.content.toString('utf-8'),
      info: file.info,
    };
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix || '';
    const files: FileInfo[] = [];
    const directories = new Set<string>();

    for (const [path, file] of this.files.entries()) {
      if (prefix && !path.startsWith(prefix)) {
        continue;
      }

      // Check if this is a "directory" (has path separator after prefix)
      const relativePath = prefix ? path.slice(prefix.length) : path;
      const slashIndex = relativePath.indexOf('/');

      if (slashIndex > 0) {
        // This is in a subdirectory
        const dirName = prefix + relativePath.slice(0, slashIndex + 1);
        directories.add(dirName);
      } else {
        files.push(file.info);
      }
    }

    const maxResults = options?.maxResults || 100;

    return {
      files: files.slice(0, maxResults),
      directories: Array.from(directories),
    };
  }

  async getInfo(path: string): Promise<FileInfo> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return file.info;
  }

  async modify(path: string, options: ModifyOptions): Promise<FileInfo> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    // Update the file info based on options
    if (options.makePublic) {
      file.info.isPublic = true;
      file.info.url = `https://storage.googleapis.com/${this.config.bucket}/${path}`;
    } else if (options.makePrivate) {
      file.info.isPublic = false;
      file.info.url = `https://storage.googleapis.com/${this.config.bucket}/${path}?X-Goog-Signature=mock`;
    }

    if (options.contentType) {
      file.info.contentType = options.contentType;
    }

    return file.info;
  }

  async delete(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  getConfig(): GCSConfig {
    return this.config;
  }
}
