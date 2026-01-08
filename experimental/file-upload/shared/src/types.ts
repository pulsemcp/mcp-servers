/**
 * Configuration for GCS uploads
 */
export interface GCSConfig {
  bucket: string;
  projectId?: string;
  keyFilename?: string;
  /** Base path prefix for all uploads (e.g., 'screenshots/') */
  basePath?: string;
  /** Whether to make uploaded files publicly accessible */
  makePublic?: boolean;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** Public URL of the uploaded file */
  url: string;
  /** GCS bucket name */
  bucket: string;
  /** Full path within the bucket */
  path: string;
  /** Size in bytes */
  size: number;
  /** Content type of the uploaded file */
  contentType: string;
}

/**
 * Options for uploading a file
 */
export interface UploadOptions {
  /** Custom filename (without path). If not provided, one will be generated */
  filename?: string;
  /** Content type. If not provided, will be inferred from filename or default to application/octet-stream */
  contentType?: string;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
}
