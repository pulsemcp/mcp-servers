import {
  ResourceStorage,
  ResourceData,
  ResourceContent,
  ResourceMetadata,
  ResourceType,
  MultiResourceWrite,
  MultiResourceUris,
} from './types.js';
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
    // Create subdirectories for each resource type
    await fs.mkdir(path.join(this.rootDir, 'raw'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'cleaned'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'extracted'), { recursive: true });
  }

  async list(): Promise<ResourceData[]> {
    await this.init();

    const resources: ResourceData[] = [];
    const subdirs: ResourceType[] = ['raw', 'cleaned', 'extracted'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.rootDir, subdir);
      try {
        const files = await fs.readdir(subdirPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            try {
              const filePath = path.join(subdirPath, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const { metadata } = this.parseMarkdownFile(content);

              const uri = `file://${filePath}`;
              resources.push({
                uri,
                name: `${subdir}/${file.replace('.md', '')}`,
                description: metadata.description || `Fetched content from ${metadata.url}`,
                mimeType: metadata.contentType || 'text/plain',
                metadata: { ...metadata, resourceType: subdir },
              });
            } catch {
              // Ignore files that can't be parsed
            }
          }
        }
      } catch {
        // Subdirectory might not exist yet, continue
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
    const resourceType = metadata?.resourceType || 'raw';
    const filePath = path.join(this.rootDir, resourceType, fileName);

    const fullMetadata: ResourceMetadata = {
      url,
      timestamp,
      resourceType,
      ...metadata,
    };

    const markdownContent = this.createMarkdownFile(fullMetadata, content);
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    return `file://${filePath}`;
  }

  async writeMulti(data: MultiResourceWrite): Promise<MultiResourceUris> {
    await this.init();

    const timestamp = new Date().toISOString();
    const fileName = this.generateFileName(data.url, timestamp);
    const uris: MultiResourceUris = {} as MultiResourceUris;

    // Save raw content
    const rawMetadata: ResourceMetadata = {
      url: data.url,
      timestamp,
      resourceType: 'raw',
      ...data.metadata,
    };
    const rawPath = path.join(this.rootDir, 'raw', fileName);
    await fs.writeFile(rawPath, this.createMarkdownFile(rawMetadata, data.raw), 'utf-8');
    uris.raw = `file://${rawPath}`;

    // Save cleaned content if provided
    if (data.cleaned) {
      const cleanedMetadata: ResourceMetadata = {
        url: data.url,
        timestamp,
        resourceType: 'cleaned',
        ...data.metadata,
      };
      const cleanedPath = path.join(this.rootDir, 'cleaned', fileName);
      await fs.writeFile(
        cleanedPath,
        this.createMarkdownFile(cleanedMetadata, data.cleaned),
        'utf-8'
      );
      uris.cleaned = `file://${cleanedPath}`;
    }

    // Save extracted content if provided
    if (data.extracted) {
      const extractedMetadata: ResourceMetadata = {
        url: data.url,
        timestamp,
        resourceType: 'extracted',
        extractionPrompt: (data.metadata?.extract as string) || data.metadata?.extractionPrompt,
        ...data.metadata,
      };
      const extractedPath = path.join(this.rootDir, 'extracted', fileName);
      await fs.writeFile(
        extractedPath,
        this.createMarkdownFile(extractedMetadata, data.extracted),
        'utf-8'
      );
      uris.extracted = `file://${extractedPath}`;
    }

    return uris;
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

  async findByUrl(url: string): Promise<ResourceData[]> {
    await this.init();

    const matchingResources: ResourceData[] = [];
    const subdirs: ResourceType[] = ['raw', 'cleaned', 'extracted'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.rootDir, subdir);
      try {
        const files = await fs.readdir(subdirPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            try {
              const filePath = path.join(subdirPath, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const { metadata } = this.parseMarkdownFile(content);

              if (metadata.url === url) {
                const uri = `file://${filePath}`;
                matchingResources.push({
                  uri,
                  name: `${subdir}/${file.replace('.md', '')}`,
                  description: metadata.description || `Fetched content from ${metadata.url}`,
                  mimeType: metadata.contentType || 'text/plain',
                  metadata: { ...metadata, resourceType: subdir },
                });
              }
            } catch {
              // Ignore files that can't be parsed
            }
          }
        }
      } catch {
        // Subdirectory might not exist yet, continue
      }
    }

    // Sort by timestamp descending (most recent first)
    matchingResources.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime();
      const timeB = new Date(b.metadata.timestamp).getTime();
      return timeB - timeA;
    });

    return matchingResources;
  }

  async findByUrlAndExtract(url: string, extractPrompt?: string): Promise<ResourceData[]> {
    await this.init();

    const matchingResources: ResourceData[] = [];
    const subdirs: ResourceType[] = ['raw', 'cleaned', 'extracted'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.rootDir, subdir);
      try {
        const files = await fs.readdir(subdirPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            try {
              const filePath = path.join(subdirPath, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const { metadata } = this.parseMarkdownFile(content);

              const matchesUrl = metadata.url === url;
              if (!extractPrompt) {
                // If no extract prompt specified, only return resources without extraction
                if (matchesUrl && !metadata.extractionPrompt) {
                  const uri = `file://${filePath}`;
                  matchingResources.push({
                    uri,
                    name: `${subdir}/${file.replace('.md', '')}`,
                    description: metadata.description || `Fetched content from ${metadata.url}`,
                    mimeType: metadata.contentType || 'text/plain',
                    metadata: { ...metadata, resourceType: subdir },
                  });
                }
              } else {
                // If extract prompt specified, match both URL and extraction prompt
                if (matchesUrl && metadata.extractionPrompt === extractPrompt) {
                  const uri = `file://${filePath}`;
                  matchingResources.push({
                    uri,
                    name: `${subdir}/${file.replace('.md', '')}`,
                    description: metadata.description || `Fetched content from ${metadata.url}`,
                    mimeType: metadata.contentType || 'text/plain',
                    metadata: { ...metadata, resourceType: subdir },
                  });
                }
              }
            } catch {
              // Ignore files that can't be parsed
            }
          }
        }
      } catch {
        // Subdirectory might not exist yet, continue
      }
    }

    // Sort by timestamp descending (most recent first)
    matchingResources.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime();
      const timeB = new Date(b.metadata.timestamp).getTime();
      return timeB - timeA;
    });

    return matchingResources;
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
