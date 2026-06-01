#!/usr/bin/env node
/**
 * Integration test entry point with a mock Google Docs/Drive client.
 * Used by TestMCPClient to exercise the full MCP protocol surface
 * without making real Google API calls.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, type IGoogleDocsClient } from '../shared/index.js';
import { logServerStart } from '../shared/logging.js';
import type {
  GoogleDoc,
  DocsBatchUpdateRequest,
  DocsBatchUpdateResponse,
  DriveFile,
  DrivePermission,
  DriveComment,
  DriveCommentList,
} from '../shared/types.js';
import type { CreatePermissionOptions } from '../shared/google-docs-client/lib/drive-permissions.js';
import type { ListCommentsOptions } from '../shared/google-docs-client/lib/drive-comments.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

const SEED_DOC_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYzSeedDocId01234';

class MockGoogleDocsClient implements IGoogleDocsClient {
  private docs: Map<string, GoogleDoc> = new Map();
  private comments: Map<string, DriveComment[]> = new Map();
  private nextDocCounter = 1;

  constructor() {
    // Seed a couple of comments (one open, one resolved with a resolving reply)
    // on the canonical document so list_comments tests have something to find.
    this.comments.set(SEED_DOC_ID, [
      {
        id: 'seed-comment-open',
        author: { displayName: 'Alice', emailAddress: 'alice@example.com' },
        content: 'Can we clarify this heading?',
        createdTime: '2026-05-01T10:00:00.000Z',
        modifiedTime: '2026-05-01T10:00:00.000Z',
        resolved: false,
        quotedFileContent: { mimeType: 'text/html', value: 'Heading 1' },
        replies: [],
      },
      {
        id: 'seed-comment-resolved',
        author: { displayName: 'Bob', emailAddress: 'bob@example.com' },
        content: 'Fixed the typo.',
        createdTime: '2026-05-02T10:00:00.000Z',
        modifiedTime: '2026-05-02T10:05:00.000Z',
        resolved: true,
        quotedFileContent: { mimeType: 'text/html', value: 'Hello world' },
        replies: [
          {
            id: 'seed-reply',
            author: { displayName: 'Alice', emailAddress: 'alice@example.com' },
            content: 'Thanks!',
            createdTime: '2026-05-02T10:05:00.000Z',
            action: 'resolve',
          },
        ],
      },
    ]);

    // Seed with a single canonical document so get/outline tests have something to find.
    this.docs.set('1AbCdEfGhIjKlMnOpQrStUvWxYzSeedDocId01234', {
      documentId: '1AbCdEfGhIjKlMnOpQrStUvWxYzSeedDocId01234',
      title: 'Seed Document',
      revisionId: 'rev-1',
      body: {
        content: [
          {
            startIndex: 1,
            endIndex: 17,
            paragraph: {
              paragraphStyle: { namedStyleType: 'TITLE' },
              elements: [{ textRun: { content: 'Seed Document\n' } }],
            },
          },
          {
            startIndex: 17,
            endIndex: 27,
            paragraph: {
              paragraphStyle: { namedStyleType: 'HEADING_1' },
              elements: [{ textRun: { content: 'Heading 1\n' } }],
            },
          },
          {
            startIndex: 27,
            endIndex: 60,
            paragraph: {
              paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
              elements: [{ textRun: { content: 'Hello world. This is the body.\n' } }],
            },
          },
        ],
      },
    });
  }

  async getDocument(documentId: string): Promise<GoogleDoc> {
    const doc = this.docs.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return doc;
  }

  async batchUpdate(
    documentId: string,
    requests: DocsBatchUpdateRequest[]
  ): Promise<DocsBatchUpdateResponse> {
    const doc = this.docs.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }
    // Build minimally-valid replies for the requests we recognize.
    const replies = requests.map((req) => {
      if (req.replaceAllText) {
        return { replaceAllText: { occurrencesChanged: 1 } };
      }
      return {};
    });
    return { documentId, replies };
  }

  async createDocument(options?: { title?: string }): Promise<GoogleDoc> {
    const counter = String(this.nextDocCounter++).padStart(4, '0');
    const documentId = `1MockCreated${counter}AbCdEfGhIjKlMnOpQrStUvWxYz123`;
    const doc: GoogleDoc = {
      documentId,
      title: options?.title || 'Untitled document',
      revisionId: 'rev-1',
      body: {
        content: [
          {
            startIndex: 1,
            endIndex: 2,
            paragraph: {
              paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
              elements: [{ textRun: { content: '\n' } }],
            },
          },
        ],
      },
    };
    this.docs.set(documentId, doc);
    return doc;
  }

  async trashDocument(documentId: string): Promise<DriveFile> {
    const doc = this.docs.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return {
      id: documentId,
      name: doc.title,
      mimeType: 'application/vnd.google-apps.document',
      trashed: true,
    };
  }

  async permanentlyDeleteDocument(documentId: string): Promise<void> {
    if (!this.docs.has(documentId)) {
      throw new Error(`Document not found: ${documentId}`);
    }
    this.docs.delete(documentId);
  }

  async exportDocument(
    documentId: string,
    mimeType: string
  ): Promise<{ bytes: Uint8Array; mimeType: string }> {
    const doc = this.docs.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }
    const text = `Mock export of "${doc.title}" as ${mimeType}`;
    return { bytes: new TextEncoder().encode(text), mimeType };
  }

  async createPermission(
    documentId: string,
    options: CreatePermissionOptions
  ): Promise<DrivePermission> {
    if (!this.docs.has(documentId)) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return {
      id: 'mock-permission-id',
      type: options.type,
      role: options.role,
      emailAddress: options.emailAddress,
      domain: options.domain,
    };
  }

  async listComments(documentId: string, options?: ListCommentsOptions): Promise<DriveCommentList> {
    if (!this.docs.has(documentId)) {
      throw new Error(`Document not found: ${documentId}`);
    }
    const all = this.comments.get(documentId) ?? [];
    const filtered = options?.includeDeleted ? all : all.filter((c) => !c.deleted);
    return { comments: filtered };
  }
}

async function main() {
  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, () => new MockGoogleDocsClient());
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logServerStart('google-docs-workspace-mcp-server-integration-mock');
}

main();
