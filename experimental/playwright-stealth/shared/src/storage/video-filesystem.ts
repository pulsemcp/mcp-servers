import {
  VideoStorage,
  VideoResourceData,
  VideoResourceContent,
  VideoMetadata,
} from './video-types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class FileSystemVideoStorage implements VideoStorage {
  private rootDir: string;
  private initialized = false;

  constructor(rootDir?: string) {
    this.rootDir = rootDir || path.join(os.tmpdir(), 'playwright-videos');
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await fs.mkdir(this.rootDir, { recursive: true });
    this.initialized = true;
  }

  async list(): Promise<VideoResourceData[]> {
    await this.init();

    const resources: VideoResourceData[] = [];

    try {
      const files = await fs.readdir(this.rootDir);
      for (const file of files) {
        if (file.endsWith('.webm')) {
          const metadataFile = file.replace('.webm', '.json');
          const filePath = path.join(this.rootDir, file);
          const metadataPath = path.join(this.rootDir, metadataFile);

          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata: VideoMetadata = JSON.parse(metadataContent);

            const uri = `file://${filePath}`;
            resources.push({
              uri,
              name: file,
              description: metadata.pageUrl
                ? `Video recording of ${metadata.pageUrl}`
                : `Video recording from ${metadata.timestamp}`,
              mimeType: 'video/webm',
              metadata,
            });
          } catch {
            // Ignore files without metadata
          }
        }
      }
    } catch {
      // Directory might not exist yet
    }

    // Sort by timestamp descending (most recent first)
    resources.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime();
      const timeB = new Date(b.metadata.timestamp).getTime();
      return timeB - timeA;
    });

    return resources;
  }

  async read(uri: string): Promise<VideoResourceContent> {
    const filePath = this.uriToFilePath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const buffer = await fs.readFile(filePath);
    const blob = buffer.toString('base64');

    return {
      uri,
      mimeType: 'video/webm',
      blob,
    };
  }

  async write(sourceFilePath: string, metadata: Omit<VideoMetadata, 'timestamp'>): Promise<string> {
    await this.init();

    const timestamp = new Date().toISOString();
    const fileName = this.generateFileName(timestamp);
    const destPath = path.join(this.rootDir, fileName);
    const metadataPath = path.join(this.rootDir, fileName.replace('.webm', '.json'));

    const fullMetadata: VideoMetadata = {
      ...metadata,
      timestamp,
    };

    // Copy the video file from Playwright's temp location to our storage
    await fs.copyFile(sourceFilePath, destPath);

    // Write the metadata
    await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2), 'utf-8');

    return `file://${destPath}`;
  }

  async exists(uri: string): Promise<boolean> {
    const filePath = this.uriToFilePath(uri);
    return this.fileExists(filePath);
  }

  async delete(uri: string): Promise<void> {
    const filePath = this.uriToFilePath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new Error(`Resource not found: ${uri}`);
    }

    await fs.unlink(filePath);

    // Also delete metadata file if it exists
    const metadataPath = filePath.replace('.webm', '.json');
    try {
      await fs.unlink(metadataPath);
    } catch {
      // Ignore if metadata file doesn't exist
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private uriToFilePath(uri: string): string {
    if (uri.startsWith('file://')) {
      return uri.substring(7);
    }
    throw new Error(`Invalid file URI: ${uri}`);
  }

  private generateFileName(timestamp: string): string {
    const timestampPart = timestamp.replace(/[^0-9T-]/g, '').replace('T', '_');
    return `video_${timestampPart}.webm`;
  }
}
