/**
 * Structured error handling for Google Calendar API errors
 */

export function handleApiError(status: number, operation: string, resourceId?: string): never {
  if (status === 401) {
    throw new Error(
      'Service account authentication failed. Verify the credentials and domain-wide delegation.'
    );
  }

  if (status === 403) {
    throw new Error(
      'Permission denied. Ensure calendar scope is granted in Google Workspace Admin Console.'
    );
  }

  if (status === 404) {
    const resource = resourceId ? `: ${resourceId}` : '';
    throw new Error(`Calendar resource not found${resource}`);
  }

  if (status === 429) {
    throw new Error('Google Calendar API rate limit exceeded. Please try again later.');
  }

  if (status === 400) {
    throw new Error(`Bad request while ${operation}. Check the request parameters.`);
  }

  if (status === 410) {
    throw new Error('Calendar sync token expired. The sync state is no longer valid.');
  }

  throw new Error(`Google Calendar API error while ${operation}: HTTP ${status}`);
}
