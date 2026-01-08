import {
  ScreenshotStorage,
  ScreenshotResourceData,
  ScreenshotResourceContent,
  ScreenshotMetadata,
} from './types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class FileSystemScreenshotStorage implements ScreenshotStorage {
  private rootDir: string;
  private initialized = false;

  constructor(rootDir?: string) {
    this.rootDir = rootDir || path.join(os.tmpdir(), 'playwright-screenshots');
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await fs.mkdir(this.rootDir, { recursive: true });
    this.initialized = true;
  }

  async list(): Promise<ScreenshotResourceData[]> {
    await this.init();

    const resources: ScreenshotResourceData[] = [];

    try {
      const files = await fs.readdir(this.rootDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          const metadataFile = file.replace('.png', '.json');
          const filePath = path.join(this.rootDir, file);
          const metadataPath = path.join(this.rootDir, metadataFile);

          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata: ScreenshotMetadata = JSON.parse(metadataContent);

            const uri = `file://${filePath}`;
            resources.push({
              uri,
              name: file,
              description: metadata.pageUrl
                ? `Screenshot of ${metadata.pageUrl}`
                : `Screenshot taken at ${metadata.timestamp}`,
              mimeType: 'image/png',
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

  async read(uri: string): Promise<ScreenshotResourceContent> {
    const filePath = this.uriToFilePath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const buffer = await fs.readFile(filePath);
    const blob = buffer.toString('base64');

    return {
      uri,
      mimeType: 'image/png',
      blob,
    };
  }

  async write(
    base64Data: string,
    metadata: Omit<ScreenshotMetadata, 'timestamp'>
  ): Promise<string> {
    await this.init();

    const timestamp = new Date().toISOString();
    const fileName = this.generateFileName(timestamp);
    const filePath = path.join(this.rootDir, fileName);
    const metadataPath = path.join(this.rootDir, fileName.replace('.png', '.json'));

    const fullMetadata: ScreenshotMetadata = {
      ...metadata,
      timestamp,
    };

    // Write the screenshot image
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    // Write the metadata
    await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2), 'utf-8');

    return `file://${filePath}`;
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
    const metadataPath = filePath.replace('.png', '.json');
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
    return `screenshot_${timestampPart}.png`;
  }
}
