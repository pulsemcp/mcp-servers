/**
 * Mock storage client for integration testing
 */
import {
  IStorageClient,
  FileMetadata,
  SearchResult,
  SaveFileOptions,
  SearchFilesOptions,
  GetFileResult,
} from './types.js';

/**
 * In-memory storage for mock data
 */
interface MockFile {
  content: string | Buffer;
  metadata: FileMetadata;
}

interface MockData {
  files?: Record<
    string,
    { content: string; contentType?: string; metadata?: Record<string, string> }
  >;
}

/**
 * Mock storage client for testing purposes
 */
export class MockStorageClient implements IStorageClient {
  private files: Map<string, MockFile> = new Map();

  constructor(initialData?: MockData) {
    if (initialData?.files) {
      for (const [path, data] of Object.entries(initialData.files)) {
        const now = new Date();
        this.files.set(path, {
          content: data.content,
          metadata: {
            path,
            size: Buffer.byteLength(data.content),
            contentType: data.contentType || 'text/plain',
            createdAt: now,
            updatedAt: now,
            customMetadata: data.metadata,
          },
        });
      }
    }
  }

  async saveFile(
    path: string,
    content: string | Buffer,
    options?: SaveFileOptions
  ): Promise<FileMetadata> {
    const now = new Date();
    const existingFile = this.files.get(path);
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;

    const metadata: FileMetadata = {
      path,
      size: contentBuffer.length,
      contentType: options?.contentType || this.guessContentType(path),
      createdAt: existingFile?.metadata.createdAt || now,
      updatedAt: now,
      customMetadata: options?.customMetadata,
    };

    this.files.set(path, { content, metadata });
    return metadata;
  }

  async getFile(path: string): Promise<GetFileResult> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return {
      content: file.content,
      metadata: file.metadata,
    };
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
  }

  async searchFiles(options?: SearchFilesOptions): Promise<SearchResult> {
    let files = Array.from(this.files.values()).map((f) => f.metadata);

    // Apply prefix filter
    if (options?.prefix) {
      files = files.filter((f) => f.path.startsWith(options.prefix!));
    }

    // Apply limit
    const limit = options?.limit || 100;
    const hasMore = files.length > limit;
    files = files.slice(0, limit);

    return {
      files,
      hasMore,
      nextPageToken: hasMore ? 'mock-next-page-token' : undefined,
    };
  }

  async listAllFiles(): Promise<FileMetadata[]> {
    return Array.from(this.files.values()).map((f) => f.metadata);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  private guessContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      md: 'text/markdown',
      js: 'application/javascript',
      ts: 'text/typescript',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}

/**
 * Create a mock storage client for integration testing
 */
export function createMockStorageClient(mockData?: Record<string, unknown>): IStorageClient {
  return new MockStorageClient(mockData as MockData);
}
