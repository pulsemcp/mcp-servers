import { ResourceStorage, ResourceData, ResourceContent, ResourceMetadata } from './types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class FileSystemResourceStorage implements ResourceStorage {
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir || path.join(os.tmpdir(), 'pulse-fetch', 'resources');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  async list(): Promise<ResourceData[]> {
    await this.init();

    const files = await fs.readdir(this.rootDir);
    const resources: ResourceData[] = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        try {
          const filePath = path.join(this.rootDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { metadata } = this.parseMarkdownFile(content);

          const uri = `file://${filePath}`;
          resources.push({
            uri,
            name: file.replace('.md', ''),
            description: metadata.description || `Fetched content from ${metadata.url}`,
            mimeType: metadata.contentType || 'text/plain',
            metadata,
          });
        } catch (error) {
          console.error(`Error reading resource file ${file}:`, error);
        }
      }
    }

    return resources;
  }

  async read(uri: string): Promise<ResourceContent> {
    const filePath = this.uriToFilePath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const { metadata, body } = this.parseMarkdownFile(content);

    return {
      uri,
      mimeType: metadata.contentType || 'text/plain',
      text: body,
    };
  }

  async write(url: string, content: string, metadata?: Partial<ResourceMetadata>): Promise<string> {
    await this.init();

    const timestamp = new Date().toISOString();
    const fileName = this.generateFileName(url, timestamp);
    const filePath = path.join(this.rootDir, fileName);

    const fullMetadata: ResourceMetadata = {
      url,
      timestamp,
      ...metadata,
    };

    const markdownContent = this.createMarkdownFile(fullMetadata, content);
    await fs.writeFile(filePath, markdownContent, 'utf-8');

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

  private generateFileName(url: string, timestamp: string): string {
    const sanitizedUrl = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestampPart = timestamp.replace(/[^0-9T-]/g, '').replace('T', '_');
    return `${sanitizedUrl}_${timestampPart}.md`;
  }

  private createMarkdownFile(metadata: ResourceMetadata, content: string): string {
    const metadataYaml = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `---
${metadataYaml}
---

${content}`;
  }

  private parseMarkdownFile(content: string): { metadata: ResourceMetadata; body: string } {
    const metadataRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(metadataRegex);

    if (!match) {
      throw new Error('Invalid markdown file format');
    }

    const metadataStr = match[1];
    const body = content.substring(match[0].length).trimStart();

    const metadata: ResourceMetadata = {
      url: '',
      timestamp: '',
    };

    metadataStr.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split(': ');
      if (key && valueParts.length > 0) {
        try {
          metadata[key] = JSON.parse(valueParts.join(': '));
        } catch {
          metadata[key] = valueParts.join(': ');
        }
      }
    });

    return { metadata, body };
  }
}
