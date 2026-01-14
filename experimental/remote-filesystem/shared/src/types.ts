/**
 * Configuration for GCS remote filesystem
 */
export interface GCSConfig {
  bucket: string;
  projectId?: string;
  /** Path to service account key file (alternative to inline credentials) */
  keyFilename?: string;
  /** Service account client email (for inline credentials) */
  clientEmail?: string;
  /** Service account private key (for inline credentials) */
  privateKey?: string;
  /** Root path prefix - server won't access files above this path */
  rootPath?: string;
  /** Whether to make uploaded files publicly accessible by default */
  makePublic?: boolean;
}

/**
 * Result of a file operation
 */
export interface FileInfo {
  /** Full path within the bucket (relative to root) */
  path: string;
  /** Size in bytes */
  size: number;
  /** Content type of the file */
  contentType: string;
  /** Last modified timestamp */
  updatedAt: string;
  /** Whether the file is publicly accessible */
  isPublic: boolean;
  /** Public URL (if public) or signed URL */
  url: string;
}

/**
 * Result of a successful upload
 */
export type UploadResult = FileInfo;

/**
 * Options for uploading a file
 */
export interface UploadOptions {
  /** Destination path (relative to root). If not provided, one will be generated */
  path?: string;
  /** Content type. If not provided, will be inferred from filename or default to application/octet-stream */
  contentType?: string;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
  /** Override default public setting for this upload */
  makePublic?: boolean;
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /** Directory path to list (relative to root) */
  prefix?: string;
  /** Maximum number of files to return */
  maxResults?: number;
  /** Only list files, not directories */
  filesOnly?: boolean;
}

/**
 * Options for downloading a file
 */
export interface DownloadOptions {
  /** Return as base64 string instead of text */
  asBase64?: boolean;
}

/**
 * Result of listing files
 */
export interface ListResult {
  /** Files in the directory */
  files: FileInfo[];
  /** Subdirectories (prefixes) */
  directories: string[];
}

/**
 * Options for modifying a file
 */
export interface ModifyOptions {
  /** Make file public */
  makePublic?: boolean;
  /** Make file private */
  makePrivate?: boolean;
  /** New content type */
  contentType?: string;
  /** Custom metadata to set */
  metadata?: Record<string, string>;
}

/**
 * Toolset configuration
 */
export type ToolsetMode = 'readonly' | 'readwrite';
