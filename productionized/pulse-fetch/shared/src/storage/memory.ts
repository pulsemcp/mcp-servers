import {
  ResourceStorage,
  ResourceData,
  ResourceContent,
  ResourceMetadata,
  ResourceType,
  MultiResourceWrite,
  MultiResourceUris,
} from './types.js';

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
    const resourceType = metadata?.resourceType || 'raw';
    const uri = this.generateUri(url, timestamp, resourceType);

    const fullMetadata: ResourceMetadata = {
      url,
      timestamp,
      resourceType,
      ...metadata,
    };

    const resourceData: ResourceData = {
      uri,
      name: this.generateName(url, timestamp, resourceType),
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

  async writeMulti(data: MultiResourceWrite): Promise<MultiResourceUris> {
    const timestamp = new Date().toISOString();
    const uris: MultiResourceUris = {} as MultiResourceUris;

    // Save raw content
    uris.raw = await this.write(data.url, data.raw, {
      ...data.metadata,
      resourceType: 'raw',
      timestamp,
    });

    // Save cleaned content if provided
    if (data.cleaned) {
      uris.cleaned = await this.write(data.url, data.cleaned, {
        ...data.metadata,
        resourceType: 'cleaned',
        timestamp,
      });
    }

    // Save extracted content if provided
    if (data.extracted) {
      uris.extracted = await this.write(data.url, data.extracted, {
        ...data.metadata,
        resourceType: 'extracted',
        extractionPrompt: (data.metadata?.extract as string) || data.metadata?.extractionPrompt,
        timestamp,
      });
    }

    return uris;
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

  async findByUrl(url: string): Promise<ResourceData[]> {
    const matchingResources = Array.from(this.resources.values())
      .filter((r) => r.data.metadata.url === url)
      .sort((a, b) => {
        // Sort by timestamp descending (most recent first)
        const timeA = new Date(a.data.metadata.timestamp).getTime();
        const timeB = new Date(b.data.metadata.timestamp).getTime();
        return timeB - timeA;
      })
      .map((r) => r.data);

    return matchingResources;
  }

  async findByUrlAndExtract(url: string, extractPrompt?: string): Promise<ResourceData[]> {
    const matchingResources = Array.from(this.resources.values())
      .filter((r) => {
        const matchesUrl = r.data.metadata.url === url;
        if (!extractPrompt) {
          // If no extract prompt specified, only return resources without extraction
          return matchesUrl && !r.data.metadata.extractionPrompt;
        }
        // If extract prompt specified, match both URL and extraction prompt
        return matchesUrl && r.data.metadata.extractionPrompt === extractPrompt;
      })
      .sort((a, b) => {
        // Sort by timestamp descending (most recent first)
        const timeA = new Date(a.data.metadata.timestamp).getTime();
        const timeB = new Date(b.data.metadata.timestamp).getTime();
        return timeB - timeA;
      })
      .map((r) => r.data);

    return matchingResources;
  }

  private generateUri(url: string, timestamp: string, resourceType: ResourceType = 'raw'): string {
    const sanitizedUrl = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestampPart = timestamp.replace(/[^0-9]/g, '');
    return `memory://${resourceType}/${sanitizedUrl}_${timestampPart}`;
  }

  private generateName(url: string, timestamp: string, resourceType: ResourceType = 'raw'): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    return `${resourceType}/${hostname}_${dateStr}`;
  }
}
