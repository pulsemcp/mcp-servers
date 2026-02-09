import { Storage } from '@google-cloud/storage';

export interface GCSClientConfig {
  projectId: string;
  keyFilePath?: string;
  keyFileContents?: string;
}

export interface ListBucketsResult {
  buckets: Array<{
    name: string;
    creationDate?: Date;
  }>;
}

export interface ListObjectsOptions {
  prefix?: string;
  maxResults?: number;
  pageToken?: string;
  delimiter?: string;
}

export interface ListObjectsResult {
  objects: Array<{
    key: string;
    size?: number;
    lastModified?: Date;
    storageClass?: string;
    etag?: string;
  }>;
  commonPrefixes: string[];
  isTruncated: boolean;
  nextPageToken?: string;
}

export interface GetObjectResult {
  content: string;
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface PutObjectOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  etag?: string;
  generation?: string;
}

export interface CopyObjectResult {
  etag?: string;
  generation?: string;
}

export interface IGCSClient {
  listBuckets(): Promise<ListBucketsResult>;
  listObjects(bucket: string, options?: ListObjectsOptions): Promise<ListObjectsResult>;
  getObject(bucket: string, key: string): Promise<GetObjectResult>;
  putObject(
    bucket: string,
    key: string,
    content: string,
    options?: PutObjectOptions
  ): Promise<PutObjectResult>;
  deleteObject(bucket: string, key: string): Promise<void>;
  createBucket(bucket: string, location?: string): Promise<void>;
  deleteBucket(bucket: string): Promise<void>;
  headBucket(bucket: string): Promise<boolean>;
  copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<CopyObjectResult>;
}

export class GoogleCloudStorageClient implements IGCSClient {
  private storage: Storage;

  constructor(config: GCSClientConfig) {
    const storageOptions: ConstructorParameters<typeof Storage>[0] = {
      projectId: config.projectId,
    };

    if (config.keyFilePath) {
      storageOptions.keyFilename = config.keyFilePath;
    } else if (config.keyFileContents) {
      try {
        storageOptions.credentials = JSON.parse(config.keyFileContents);
      } catch {
        throw new Error(
          'Failed to parse GCS_SERVICE_ACCOUNT_KEY_JSON: invalid JSON. Ensure the value is a valid JSON string.'
        );
      }
    }
    // If neither is provided, uses Application Default Credentials (ADC)

    this.storage = new Storage(storageOptions);
  }

  async listBuckets(): Promise<ListBucketsResult> {
    const [buckets] = await this.storage.getBuckets();

    return {
      buckets: buckets.map((bucket) => ({
        name: bucket.name,
        creationDate: bucket.metadata.timeCreated
          ? new Date(bucket.metadata.timeCreated as string)
          : undefined,
      })),
    };
  }

  async listObjects(bucket: string, options: ListObjectsOptions = {}): Promise<ListObjectsResult> {
    const [files, , apiResponse] = await this.storage.bucket(bucket).getFiles({
      prefix: options.prefix,
      maxResults: options.maxResults,
      pageToken: options.pageToken,
      delimiter: options.delimiter,
      autoPaginate: false,
    });

    const commonPrefixes: string[] =
      (apiResponse as { prefixes?: string[] })?.prefixes?.map((p: string) => p) || [];

    const nextPageToken = (apiResponse as { nextPageToken?: string })?.nextPageToken;

    return {
      objects: files.map((file) => ({
        key: file.name,
        size: file.metadata.size ? Number(file.metadata.size) : undefined,
        lastModified: file.metadata.updated ? new Date(file.metadata.updated as string) : undefined,
        storageClass: file.metadata.storageClass as string | undefined,
        etag: file.metadata.etag as string | undefined,
      })),
      commonPrefixes,
      isTruncated: !!nextPageToken,
      nextPageToken,
    };
  }

  async getObject(bucket: string, key: string): Promise<GetObjectResult> {
    const file = this.storage.bucket(bucket).file(key);
    const [content] = await file.download();
    const [metadata] = await file.getMetadata();

    return {
      content: content.toString('utf-8'),
      contentType: metadata.contentType as string | undefined,
      contentLength: metadata.size ? Number(metadata.size) : undefined,
      lastModified: metadata.updated ? new Date(metadata.updated as string) : undefined,
      etag: metadata.etag as string | undefined,
      metadata: (metadata.metadata as Record<string, string>) || {},
    };
  }

  async putObject(
    bucket: string,
    key: string,
    content: string,
    options: PutObjectOptions = {}
  ): Promise<PutObjectResult> {
    const file = this.storage.bucket(bucket).file(key);

    await file.save(content, {
      contentType: options.contentType,
      metadata: options.metadata,
    });

    const [metadata] = await file.getMetadata();

    return {
      etag: metadata.etag as string | undefined,
      generation: metadata.generation ? String(metadata.generation) : undefined,
    };
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.storage.bucket(bucket).file(key).delete();
  }

  async createBucket(bucket: string, location?: string): Promise<void> {
    await this.storage.createBucket(bucket, {
      location: location || 'US',
    });
  }

  async deleteBucket(bucket: string): Promise<void> {
    await this.storage.bucket(bucket).delete();
  }

  async headBucket(bucket: string): Promise<boolean> {
    const [exists] = await this.storage.bucket(bucket).exists();
    return exists;
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<CopyObjectResult> {
    const sourceFile = this.storage.bucket(sourceBucket).file(sourceKey);
    const destFile = this.storage.bucket(destBucket).file(destKey);

    const [, apiResponse] = await sourceFile.copy(destFile);

    const resource = (apiResponse as { resource?: { etag?: string; generation?: string } })
      ?.resource;
    return {
      etag: resource?.etag,
      generation: resource?.generation ? String(resource.generation) : undefined,
    };
  }
}
