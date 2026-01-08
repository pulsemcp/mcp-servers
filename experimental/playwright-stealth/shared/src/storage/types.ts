/**
 * Types for screenshot resource storage
 */

export interface ScreenshotMetadata {
  timestamp: string;
  pageUrl?: string;
  pageTitle?: string;
  fullPage: boolean;
}

export interface ScreenshotResourceData {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  metadata: ScreenshotMetadata;
}

export interface ScreenshotResourceContent {
  uri: string;
  mimeType: string;
  blob: string; // Base64-encoded PNG data
}

export interface ScreenshotStorage {
  list(): Promise<ScreenshotResourceData[]>;
  read(uri: string): Promise<ScreenshotResourceContent>;
  write(base64Data: string, metadata: Omit<ScreenshotMetadata, 'timestamp'>): Promise<string>;
  exists(uri: string): Promise<boolean>;
  delete(uri: string): Promise<void>;
}
