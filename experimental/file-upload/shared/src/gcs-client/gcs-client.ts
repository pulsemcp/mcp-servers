import { Storage } from '@google-cloud/storage';
import type {
  GCSConfig,
  FileInfo,
  UploadResult,
  UploadOptions,
  ListOptions,
  ListResult,
  DownloadOptions,
  ModifyOptions,
} from '../types.js';

/**
 * Interface for GCS remote filesystem operations
 */
export interface IGCSClient {
  /**
   * Upload data to GCS
   * @param data - Buffer or base64 string to upload
   * @param options - Upload options
   * @returns Upload result with file info
   */
  upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Upload a file from disk to GCS
   * @param filePath - Path to the file on disk
   * @param options - Upload options
   * @returns Upload result with file info
   */
  uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download a file from GCS
   * @param path - Path to the file (relative to root)
   * @param options - Download options
   * @returns File contents as string or base64
   */
  download(path: string, options?: DownloadOptions): Promise<{ content: string; info: FileInfo }>;

  /**
   * List files in a directory
   * @param options - List options
   * @returns List of files and directories
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Get file info
   * @param path - Path to the file (relative to root)
   * @returns File info
   */
  getInfo(path: string): Promise<FileInfo>;

  /**
   * Modify file properties
   * @param path - Path to the file (relative to root)
   * @param options - Modify options
   * @returns Updated file info
   */
  modify(path: string, options: ModifyOptions): Promise<FileInfo>;

  /**
   * Delete a file
   * @param path - Path to the file (relative to root)
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   * @param path - Path to the file (relative to root)
   */
  exists(path: string): Promise<boolean>;

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

    // Build storage options based on available credentials
    const storageOptions: ConstructorParameters<typeof Storage>[0] = {};

    if (config.projectId) {
      storageOptions.projectId = config.projectId;
    }

    // Option 1: Key file path
    if (config.keyFilename) {
      storageOptions.keyFilename = config.keyFilename;
    }
    // Option 2: Inline credentials
    else if (config.clientEmail && config.privateKey) {
      storageOptions.credentials = {
        client_email: config.clientEmail,
        private_key: config.privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      };
    }
    // Option 3: Application Default Credentials (ADC) - no config needed

    this.storage = new Storage(storageOptions);
  }

  async upload(data: Buffer | string, options?: UploadOptions): Promise<UploadResult> {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

    const filename = options?.path || this.generateFilename(options?.contentType);
    const fullPath = this.getFullPath(filename);
    const contentType = options?.contentType || this.inferContentType(filename);
    const makePublic = options?.makePublic ?? this.config.makePublic ?? false;

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: options?.metadata,
      },
      resumable: false,
    });

    if (makePublic) {
      await file.makePublic();
    }

    const url = makePublic
      ? `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`
      : await this.getSignedUrl(file);

    return {
      path: this.getRelativePath(fullPath),
      size: buffer.length,
      contentType,
      updatedAt: new Date().toISOString(),
      isPublic: makePublic,
      url,
    };
  }

  async uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const buffer = await fs.readFile(filePath);
    const destPath = options?.path || path.basename(filePath);
    const contentType = options?.contentType || this.inferContentType(destPath);

    return this.upload(buffer, {
      ...options,
      path: destPath,
      contentType,
    });
  }

  async download(
    remotePath: string,
    options?: DownloadOptions
  ): Promise<{ content: string; info: FileInfo }> {
    const fullPath = this.getFullPath(remotePath);
    this.validatePath(fullPath);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${remotePath}`);
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    const content = options?.asBase64 ? buffer.toString('base64') : buffer.toString('utf-8');

    const isPublic = await this.checkIsPublic(file);
    const url = isPublic
      ? `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`
      : await this.getSignedUrl(file);

    return {
      content,
      info: {
        path: this.getRelativePath(fullPath),
        size: Number(metadata.size) || buffer.length,
        contentType: metadata.contentType || 'application/octet-stream',
        updatedAt: metadata.updated || new Date().toISOString(),
        isPublic,
        url,
      },
    };
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix ? this.getFullPath(options.prefix) : this.config.rootPath || '';
    const normalizedPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;

    const bucket = this.storage.bucket(this.config.bucket);

    const [files, , apiResponse] = await bucket.getFiles({
      prefix: normalizedPrefix || undefined,
      maxResults: options?.maxResults,
      delimiter: '/',
      autoPaginate: false,
    });

    const fileInfos: FileInfo[] = await Promise.all(
      files.map(async (file) => {
        const isPublic = await this.checkIsPublic(file);
        const url = isPublic
          ? `https://storage.googleapis.com/${this.config.bucket}/${file.name}`
          : await this.getSignedUrl(file);

        return {
          path: this.getRelativePath(file.name),
          size: Number(file.metadata.size) || 0,
          contentType: file.metadata.contentType || 'application/octet-stream',
          updatedAt: file.metadata.updated || '',
          isPublic,
          url,
        };
      })
    );

    // Get directories (prefixes) from the API response
    const directories: string[] = ((apiResponse as { prefixes?: string[] })?.prefixes || []).map(
      (p: string) => this.getRelativePath(p)
    );

    return {
      files: fileInfos,
      directories,
    };
  }

  async getInfo(remotePath: string): Promise<FileInfo> {
    const fullPath = this.getFullPath(remotePath);
    this.validatePath(fullPath);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${remotePath}`);
    }

    const [metadata] = await file.getMetadata();
    const isPublic = await this.checkIsPublic(file);
    const url = isPublic
      ? `https://storage.googleapis.com/${this.config.bucket}/${fullPath}`
      : await this.getSignedUrl(file);

    return {
      path: this.getRelativePath(fullPath),
      size: Number(metadata.size) || 0,
      contentType: metadata.contentType || 'application/octet-stream',
      updatedAt: metadata.updated || '',
      isPublic,
      url,
    };
  }

  async modify(remotePath: string, options: ModifyOptions): Promise<FileInfo> {
    const fullPath = this.getFullPath(remotePath);
    this.validatePath(fullPath);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${remotePath}`);
    }

    // Update metadata if provided
    if (options.contentType || options.metadata) {
      const metadataUpdate: Record<string, unknown> = {};
      if (options.contentType) {
        metadataUpdate.contentType = options.contentType;
      }
      if (options.metadata) {
        metadataUpdate.metadata = options.metadata;
      }
      await file.setMetadata(metadataUpdate);
    }

    // Handle public/private changes
    if (options.makePublic) {
      await file.makePublic();
    } else if (options.makePrivate) {
      await file.makePrivate();
    }

    return this.getInfo(remotePath);
  }

  async delete(remotePath: string): Promise<void> {
    const fullPath = this.getFullPath(remotePath);
    this.validatePath(fullPath);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${remotePath}`);
    }

    await file.delete();
  }

  async exists(remotePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(remotePath);
    this.validatePath(fullPath);

    const bucket = this.storage.bucket(this.config.bucket);
    const file = bucket.file(fullPath);

    const [exists] = await file.exists();
    return exists;
  }

  getConfig(): GCSConfig {
    return this.config;
  }

  /**
   * Get the full path including root prefix
   */
  private getFullPath(relativePath: string): string {
    // Remove leading slash if present
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    if (this.config.rootPath) {
      const cleanRoot = this.config.rootPath.endsWith('/')
        ? this.config.rootPath
        : `${this.config.rootPath}/`;
      return `${cleanRoot}${cleanPath}`;
    }
    return cleanPath;
  }

  /**
   * Get path relative to root
   */
  private getRelativePath(fullPath: string): string {
    if (this.config.rootPath) {
      const cleanRoot = this.config.rootPath.endsWith('/')
        ? this.config.rootPath
        : `${this.config.rootPath}/`;
      if (fullPath.startsWith(cleanRoot)) {
        return fullPath.slice(cleanRoot.length);
      }
    }
    return fullPath;
  }

  /**
   * Validate that the path is within the root (prevent path traversal)
   */
  private validatePath(fullPath: string): void {
    if (this.config.rootPath) {
      const cleanRoot = this.config.rootPath.endsWith('/')
        ? this.config.rootPath
        : `${this.config.rootPath}/`;

      // Check for path traversal attempts
      if (fullPath.includes('..')) {
        throw new Error('Path traversal not allowed');
      }

      if (!fullPath.startsWith(cleanRoot) && fullPath !== this.config.rootPath) {
        throw new Error(`Access denied: path is outside root directory`);
      }
    }
  }

  private async checkIsPublic(
    file: ReturnType<ReturnType<typeof Storage.prototype.bucket>['file']>
  ): Promise<boolean> {
    try {
      const [acl] = await file.acl.get({ entity: 'allUsers' });
      return Array.isArray(acl) ? acl.length > 0 : !!acl;
    } catch {
      return false;
    }
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
      md: 'text/markdown',
      js: 'application/javascript',
      ts: 'application/typescript',
      css: 'text/css',
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
