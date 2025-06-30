import { ResourceStorage, ResourceData, ResourceContent, ResourceMetadata } from './types.js';

export class MemoryResourceStorage implements ResourceStorage {
  private resources: Map<string, { data: ResourceData; content: string }> = new Map();

  async list(): Promise<ResourceData[]> {
    return Array.from(this.resources.values()).map((r) => r.data);
  }

  async read(uri: string): Promise<ResourceContent> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    return {
      uri,
      mimeType: resource.data.mimeType,
      text: resource.content,
    };
  }

  async write(url: string, content: string, metadata?: Partial<ResourceMetadata>): Promise<string> {
    const timestamp = new Date().toISOString();
    const uri = this.generateUri(url, timestamp);

    const fullMetadata: ResourceMetadata = {
      url,
      timestamp,
      ...metadata,
    };

    const resourceData: ResourceData = {
      uri,
      name: this.generateName(url, timestamp),
      description: metadata?.description || `Fetched content from ${url}`,
      mimeType: metadata?.contentType || 'text/plain',
      metadata: fullMetadata,
    };

    this.resources.set(uri, {
      data: resourceData,
      content,
    });

    return uri;
  }

  async exists(uri: string): Promise<boolean> {
    return this.resources.has(uri);
  }

  async delete(uri: string): Promise<void> {
    if (!this.resources.has(uri)) {
      throw new Error(`Resource not found: ${uri}`);
    }
    this.resources.delete(uri);
  }

  private generateUri(url: string, timestamp: string): string {
    const sanitizedUrl = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestampPart = timestamp.replace(/[^0-9]/g, '');
    return `memory://${sanitizedUrl}_${timestampPart}`;
  }

  private generateName(url: string, timestamp: string): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    return `${hostname}_${dateStr}`;
  }
}
