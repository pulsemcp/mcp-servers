/**
 * Types for video resource storage
 */

export interface VideoMetadata {
  timestamp: string;
  pageUrl?: string;
  pageTitle?: string;
  durationMs?: number;
}

export interface VideoResourceData {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  metadata: VideoMetadata;
}

export interface VideoResourceContent {
  uri: string;
  mimeType: string;
  blob: string; // Base64-encoded WebM video data
}

export interface VideoStorage {
  list(): Promise<VideoResourceData[]>;
  read(uri: string): Promise<VideoResourceContent>;
  write(filePath: string, metadata: Omit<VideoMetadata, 'timestamp'>): Promise<string>;
  exists(uri: string): Promise<boolean>;
  delete(uri: string): Promise<void>;
}
