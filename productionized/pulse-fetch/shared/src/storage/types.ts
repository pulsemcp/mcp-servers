export interface ResourceMetadata {
  url: string;
  timestamp: string;
  contentType?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ResourceData {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata: ResourceMetadata;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ResourceStorage {
  list(): Promise<ResourceData[]>;
  read(uri: string): Promise<ResourceContent>;
  write(url: string, content: string, metadata?: Partial<ResourceMetadata>): Promise<string>;
  exists(uri: string): Promise<boolean>;
  delete(uri: string): Promise<void>;
}
