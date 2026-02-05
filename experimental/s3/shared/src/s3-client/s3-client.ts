import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  CopyObjectCommand,
  type Bucket,
  type _Object,
} from '@aws-sdk/client-s3';

export interface S3ClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint?: string;
}

export interface ListBucketsResult {
  buckets: Array<{
    name: string;
    creationDate?: Date;
  }>;
}

export interface ListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
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
  nextContinuationToken?: string;
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
  versionId?: string;
}

export interface CopyObjectResult {
  etag?: string;
  lastModified?: Date;
}

export interface IS3Client {
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
  createBucket(bucket: string, region?: string): Promise<void>;
  deleteBucket(bucket: string): Promise<void>;
  headBucket(bucket: string): Promise<boolean>;
  copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<CopyObjectResult>;
}

export class AwsS3Client implements IS3Client {
  private client: S3Client;
  private config: S3ClientConfig;

  constructor(config: S3ClientConfig) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
  }

  async listBuckets(): Promise<ListBucketsResult> {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);

    return {
      buckets: (response.Buckets || []).map((bucket: Bucket) => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate,
      })),
    };
  }

  async listObjects(bucket: string, options: ListObjectsOptions = {}): Promise<ListObjectsResult> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: options.prefix,
      MaxKeys: options.maxKeys,
      ContinuationToken: options.continuationToken,
      Delimiter: options.delimiter,
    });

    const response = await this.client.send(command);

    return {
      objects: (response.Contents || []).map((obj: _Object) => ({
        key: obj.Key || '',
        size: obj.Size,
        lastModified: obj.LastModified,
        storageClass: obj.StorageClass,
        etag: obj.ETag,
      })),
      commonPrefixes: (response.CommonPrefixes || []).map((p) => p.Prefix || ''),
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  async getObject(bucket: string, key: string): Promise<GetObjectResult> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const body = await response.Body?.transformToString('utf-8');

    return {
      content: body || '',
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
      metadata: response.Metadata,
    };
  }

  async putObject(
    bucket: string,
    key: string,
    content: string,
    options: PutObjectOptions = {}
  ): Promise<PutObjectResult> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    const response = await this.client.send(command);

    return {
      etag: response.ETag,
      versionId: response.VersionId,
    };
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async createBucket(bucket: string, region?: string): Promise<void> {
    const locationConstraint = region || this.config.region;

    const command = new CreateBucketCommand({
      Bucket: bucket,
      // Only set LocationConstraint for non-us-east-1 regions
      ...(locationConstraint !== 'us-east-1' && {
        CreateBucketConfiguration: {
          LocationConstraint: locationConstraint as
            | 'af-south-1'
            | 'ap-east-1'
            | 'ap-northeast-1'
            | 'ap-northeast-2'
            | 'ap-northeast-3'
            | 'ap-south-1'
            | 'ap-south-2'
            | 'ap-southeast-1'
            | 'ap-southeast-2'
            | 'ap-southeast-3'
            | 'ca-central-1'
            | 'cn-north-1'
            | 'cn-northwest-1'
            | 'EU'
            | 'eu-central-1'
            | 'eu-north-1'
            | 'eu-south-1'
            | 'eu-south-2'
            | 'eu-west-1'
            | 'eu-west-2'
            | 'eu-west-3'
            | 'me-south-1'
            | 'sa-east-1'
            | 'us-east-2'
            | 'us-gov-east-1'
            | 'us-gov-west-1'
            | 'us-west-1'
            | 'us-west-2',
        },
      }),
    });

    await this.client.send(command);
  }

  async deleteBucket(bucket: string): Promise<void> {
    const command = new DeleteBucketCommand({
      Bucket: bucket,
    });

    await this.client.send(command);
  }

  async headBucket(bucket: string): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({
        Bucket: bucket,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<CopyObjectResult> {
    const command = new CopyObjectCommand({
      Bucket: destBucket,
      Key: destKey,
      CopySource: `${sourceBucket}/${sourceKey}`,
    });

    const response = await this.client.send(command);

    return {
      etag: response.CopyObjectResult?.ETag,
      lastModified: response.CopyObjectResult?.LastModified,
    };
  }
}
