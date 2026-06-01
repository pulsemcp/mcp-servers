import { throwForGoogleApiError } from './api-errors.js';
import { logWarning } from '../../logging.js';
import type { DriveComment, DriveCommentList } from '../../types.js';

const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Drive's `comments.list` requires an explicit `fields` mask — it returns a 400
 * if one is not supplied. We request the full comment + nested reply shape this
 * server surfaces (author, body, timestamps, resolved state, anchored quote,
 * and replies including their resolve/reopen `action`).
 */
const COMMENT_FIELDS =
  'nextPageToken,comments(' +
  'id,author(displayName,emailAddress,me),content,htmlContent,' +
  'createdTime,modifiedTime,resolved,deleted,anchor,' +
  'quotedFileContent(mimeType,value),' +
  'replies(id,author(displayName,emailAddress,me),content,htmlContent,' +
  'createdTime,modifiedTime,action,deleted)' +
  ')';

/** Drive caps `pageSize` at 100 for comments.list. */
const PAGE_SIZE = 100;

/**
 * Safety cap on total pages fetched, so a doc with a pathological number of
 * comments can't cause an unbounded fetch loop. 50 pages × 100 = 5000 comments.
 */
const MAX_PAGES = 50;

export interface ListCommentsOptions {
  /**
   * When true, include deleted comments (Drive omits them by default).
   */
  includeDeleted?: boolean;
}

/**
 * List all comments on a Drive file (e.g. a Google Doc), following pagination.
 *
 * Requires a read scope broad enough to see the file's comments. `drive.file`
 * only covers files this app created/opened; reading comments on an arbitrary
 * existing doc requires the broader `drive` scope.
 */
export async function listComments(
  headers: Record<string, string>,
  fileId: string,
  options?: ListCommentsOptions
): Promise<DriveCommentList> {
  const comments: DriveComment[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({
      fields: COMMENT_FIELDS,
      pageSize: String(PAGE_SIZE),
      includeDeleted: String(options?.includeDeleted ?? false),
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `${DRIVE_BASE_URL}/${encodeURIComponent(fileId)}/comments?${params.toString()}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      await throwForGoogleApiError(response, `List comments for ${fileId}`);
    }

    const body = (await response.json()) as {
      comments?: DriveComment[];
      nextPageToken?: string;
    };
    if (body.comments) {
      comments.push(...body.comments);
    }
    pageToken = body.nextPageToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  // A still-set pageToken after the loop means the safety cap was hit with more
  // comments remaining. Warn and signal the partial result so the caller doesn't
  // present a truncated list as complete.
  const truncated = Boolean(pageToken);
  if (truncated) {
    logWarning(
      'drive-comments',
      `Comment list for ${fileId} truncated at the ${MAX_PAGES * PAGE_SIZE}-comment cap; more comments exist but were not fetched.`
    );
  }

  return { comments, truncated };
}
