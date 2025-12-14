/**
 * Types for cloud storage operations
 */

/**
 * Metadata for a stored file
 */
export interface FileMetadata {
  /** Unique file path/key in the storage bucket */
  path: string;
  /** File size in bytes */
  size: number;
  /** Content type (MIME type) */
  contentType: string;
  /** Last modified timestamp */
  updatedAt: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Custom metadata key-value pairs */
  customMetadata?: Record<string, string>;
}

/**
 * Result of a file search operation
 */
export interface SearchResult {
  /** Files matching the search criteria */
  files: FileMetadata[];
  /** Whether there are more results available */
  hasMore: boolean;
  /** Token for fetching the next page of results (if any) */
  nextPageToken?: string;
}

/**
 * Options for saving a file
 */
export interface SaveFileOptions {
  /** Content type (MIME type) for the file. Auto-detected if not provided */
  contentType?: string;
  /** Custom metadata to store with the file */
  customMetadata?: Record<string, string>;
}

/**
 * Options for searching files
 */
export interface SearchFilesOptions {
  /** Prefix to filter files (like a folder path) */
  prefix?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Token for pagination (from previous search result) */
  pageToken?: string;
  /** Delimiter for "folder-like" behavior (typically '/') */
  delimiter?: string;
}

/**
 * Result of a get file operation
 */
export interface GetFileResult {
  /** File content as a string or Buffer */
  content: string | Buffer;
  /** File metadata */
  metadata: FileMetadata;
}

/**
 * Interface for cloud storage operations
 * Implementations: GCSStorageClient, (future) S3StorageClient
 */
export interface IStorageClient {
  /**
   * Save a file to cloud storage
   * @param path - The file path/key in the bucket
   * @param content - The file content (string or Buffer)
   * @param options - Optional save options
   * @returns The metadata of the saved file
   */
  saveFile(
    path: string,
    content: string | Buffer,
    options?: SaveFileOptions
  ): Promise<FileMetadata>;

  /**
   * Get a file from cloud storage
   * @param path - The file path/key in the bucket
   * @returns The file content and metadata
   */
  getFile(path: string): Promise<GetFileResult>;

  /**
   * Delete a file from cloud storage
   * @param path - The file path/key in the bucket
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Search/list files in cloud storage
   * @param options - Search options (prefix, limit, pagination)
   * @returns Search results with file metadata
   */
  searchFiles(options?: SearchFilesOptions): Promise<SearchResult>;

  /**
   * List all files (for MCP resources)
   * @returns Array of all file metadata
   */
  listAllFiles(): Promise<FileMetadata[]>;

  /**
   * Check if a file exists
   * @param path - The file path/key in the bucket
   * @returns true if file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;
}

/**
 * Configuration for cloud storage client
 */
export interface StorageConfig {
  /** Cloud provider type */
  provider: 'gcs' | 's3';
  /** Bucket name */
  bucket: string;
  /** Optional root directory prefix within the bucket */
  rootDirectory?: string;
}

/**
 * GCS-specific configuration
 */
export interface GCSConfig extends StorageConfig {
  provider: 'gcs';
  /** Path to service account key file (optional if using default credentials) */
  keyFilePath?: string;
  /** Project ID (optional if using default credentials) */
  projectId?: string;
}
