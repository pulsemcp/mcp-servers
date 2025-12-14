/**
 * Google Cloud Storage client implementation
 */
import { Storage, Bucket, File } from '@google-cloud/storage';
import {
  IStorageClient,
  FileMetadata,
  SearchResult,
  SaveFileOptions,
  SearchFilesOptions,
  GetFileResult,
  GCSConfig,
} from './types.js';

/**
 * Get the MIME type for a file based on its extension
 */
function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'text/typescript',
    md: 'text/markdown',
    xml: 'application/xml',
    csv: 'text/csv',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Google Cloud Storage client implementation
 */
export class GCSStorageClient implements IStorageClient {
  private storage: Storage;
  private bucket: Bucket;
  private rootDirectory: string;

  constructor(config: GCSConfig) {
    const storageOptions: ConstructorParameters<typeof Storage>[0] = {};

    // Priority: individual credentials > key file > default credentials
    if (config.credentials) {
      // Use individual credential fields
      storageOptions.credentials = {
        client_email: config.credentials.clientEmail,
        private_key: config.credentials.privateKey,
      };
      storageOptions.projectId = config.credentials.projectId;
    } else if (config.keyFilePath) {
      // Use key file path
      storageOptions.keyFilename = config.keyFilePath;
      if (config.projectId) {
        storageOptions.projectId = config.projectId;
      }
    } else if (config.projectId) {
      // Just project ID (for default credentials)
      storageOptions.projectId = config.projectId;
    }
    // If none provided, will use Application Default Credentials

    this.storage = new Storage(storageOptions);
    this.bucket = this.storage.bucket(config.bucket);
    this.rootDirectory = config.rootDirectory ? config.rootDirectory.replace(/\/$/, '') + '/' : '';
  }

  /**
   * Validate that a path doesn't contain path traversal sequences
   */
  private validatePath(path: string): void {
    if (path.includes('..')) {
      throw new Error('Path traversal not allowed: paths cannot contain ".."');
    }
  }

  /**
   * Get the full path including root directory
   */
  private getFullPath(path: string): string {
    // Validate path for security
    this.validatePath(path);
    // Remove leading slash if present
    const cleanPath = path.replace(/^\//, '');
    return this.rootDirectory + cleanPath;
  }

  /**
   * Get the relative path (removing root directory prefix)
   */
  private getRelativePath(fullPath: string): string {
    if (this.rootDirectory && fullPath.startsWith(this.rootDirectory)) {
      return fullPath.substring(this.rootDirectory.length);
    }
    return fullPath;
  }

  /**
   * Convert GCS file metadata to our FileMetadata type
   */
  private toFileMetadata(file: File, metadata: Record<string, unknown>): FileMetadata {
    return {
      path: this.getRelativePath(file.name),
      size: Number(metadata.size) || 0,
      contentType: (metadata.contentType as string) || 'application/octet-stream',
      updatedAt: metadata.updated ? new Date(metadata.updated as string) : new Date(),
      createdAt: metadata.timeCreated ? new Date(metadata.timeCreated as string) : new Date(),
      customMetadata: metadata.metadata as Record<string, string> | undefined,
    };
  }

  async saveFile(
    path: string,
    content: string | Buffer,
    options?: SaveFileOptions
  ): Promise<FileMetadata> {
    const fullPath = this.getFullPath(path);
    const file = this.bucket.file(fullPath);

    const contentType = options?.contentType || getMimeType(path);
    const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    await file.save(contentBuffer, {
      contentType,
      metadata: options?.customMetadata ? { metadata: options.customMetadata } : undefined,
    });

    // Fetch and return the metadata
    const [metadata] = await file.getMetadata();

    return this.toFileMetadata(file, metadata);
  }

  async getFile(path: string): Promise<GetFileResult> {
    const fullPath = this.getFullPath(path);
    const file = this.bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }

    const [content] = await file.download();
    const [metadata] = await file.getMetadata();

    // Determine if content should be returned as string or buffer
    // For text types, return as string
    const contentType = (metadata.contentType as string) || 'application/octet-stream';
    const isTextType =
      contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      contentType === 'application/xml' ||
      contentType === 'application/javascript';

    return {
      content: isTextType ? content.toString('utf-8') : content,
      metadata: this.toFileMetadata(file, metadata),
    };
  }

  async deleteFile(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    const file = this.bucket.file(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }

    await file.delete();
  }

  async searchFiles(options?: SearchFilesOptions): Promise<SearchResult> {
    const prefix = options?.prefix
      ? this.getFullPath(options.prefix)
      : this.rootDirectory || undefined;

    const [files, , apiResponse] = await this.bucket.getFiles({
      prefix,
      maxResults: options?.limit || 100,
      pageToken: options?.pageToken,
      delimiter: options?.delimiter,
      autoPaginate: false,
    });

    const fileMetadata = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return this.toFileMetadata(file, metadata);
      })
    );

    // apiResponse is typed as {} but actually contains nextPageToken
    const response = apiResponse as { nextPageToken?: string } | undefined;

    return {
      files: fileMetadata,
      hasMore: !!response?.nextPageToken,
      nextPageToken: response?.nextPageToken,
    };
  }

  async listAllFiles(): Promise<FileMetadata[]> {
    const allFiles: FileMetadata[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.searchFiles({ pageToken, limit: 1000 });
      allFiles.push(...result.files);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  async fileExists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    const file = this.bucket.file(fullPath);
    const [exists] = await file.exists();
    return exists;
  }
}
