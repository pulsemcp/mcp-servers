/**
 * Subset of the Google Docs API Document resource that this server inspects directly.
 *
 * The Docs API surface is huge; we deliberately model only the fields we read
 * (text extraction, headings, document metadata) and treat unfamiliar fields
 * as opaque pass-through. Anything else is preserved verbatim under the
 * `[k: string]: unknown` index signature so callers asking for the raw
 * structured response get the full payload.
 */

export interface TextRun {
  content: string;
  textStyle?: Record<string, unknown>;
}

export interface ParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: TextRun;
  pageBreak?: Record<string, unknown>;
  horizontalRule?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface ParagraphStyle {
  namedStyleType?: string;
  [k: string]: unknown;
}

export interface Paragraph {
  elements?: ParagraphElement[];
  paragraphStyle?: ParagraphStyle;
  [k: string]: unknown;
}

export interface StructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: Paragraph;
  sectionBreak?: Record<string, unknown>;
  table?: Record<string, unknown>;
  tableOfContents?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface DocumentBody {
  content?: StructuralElement[];
  [k: string]: unknown;
}

export interface GoogleDoc {
  documentId: string;
  title?: string;
  body?: DocumentBody;
  revisionId?: string;
  documentStyle?: Record<string, unknown>;
  namedStyles?: Record<string, unknown>;
  inlineObjects?: Record<string, unknown>;
  positionedObjects?: Record<string, unknown>;
  lists?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * Generic Docs batchUpdate request - the union type is enormous in the real API.
 * We leave it as a permissive object so callers can pass whatever the Docs API accepts.
 * See: https://developers.google.com/docs/api/reference/rest/v1/documents/request
 */
export type DocsBatchUpdateRequest = Record<string, unknown>;

export interface DocsBatchUpdateResponse {
  documentId: string;
  replies?: Array<Record<string, unknown>>;
  writeControl?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * Drive `files.get` minimal projection used by this server.
 */
export interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  webViewLink?: string;
  [k: string]: unknown;
}

export interface DrivePermission {
  id?: string;
  type?: string;
  role?: string;
  emailAddress?: string;
  domain?: string;
  displayName?: string;
  [k: string]: unknown;
}

/**
 * Drive `comments` resource author (a `User`).
 */
export interface DriveCommentAuthor {
  displayName?: string;
  emailAddress?: string;
  me?: boolean;
  [k: string]: unknown;
}

/**
 * A reply to a Drive comment. The `action` field, when present, is either
 * `resolve` or `reopen` — replies that toggle the parent comment's resolved state.
 */
export interface DriveCommentReply {
  id?: string;
  author?: DriveCommentAuthor;
  content?: string;
  htmlContent?: string;
  createdTime?: string;
  modifiedTime?: string;
  action?: string;
  deleted?: boolean;
  [k: string]: unknown;
}

/**
 * A Drive `comments` resource. `quotedFileContent` is the document text the
 * comment is anchored to; `resolved` indicates a resolved (closed) thread.
 */
export interface DriveComment {
  id?: string;
  author?: DriveCommentAuthor;
  content?: string;
  htmlContent?: string;
  createdTime?: string;
  modifiedTime?: string;
  resolved?: boolean;
  deleted?: boolean;
  anchor?: string;
  quotedFileContent?: {
    mimeType?: string;
    value?: string;
  };
  replies?: DriveCommentReply[];
  [k: string]: unknown;
}

export interface DriveCommentList {
  comments: DriveComment[];
  /**
   * True when the document has more comments than were fetched (the pagination
   * safety cap was hit). Callers should signal that the list is partial.
   */
  truncated?: boolean;
}
