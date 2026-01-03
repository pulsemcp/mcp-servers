/**
 * Handles Gmail API errors with structured error messages
 * @param status HTTP status code
 * @param operation Description of the operation that failed
 * @param resourceId Optional resource identifier (e.g., message ID)
 */
export function handleApiError(status: number, operation: string, resourceId?: string): never {
  if (status === 401) {
    throw new Error(
      'Service account authentication failed. Verify the key file and domain-wide delegation.'
    );
  }
  if (status === 403) {
    throw new Error(
      'Permission denied. Ensure gmail.readonly scope is granted in Google Workspace Admin.'
    );
  }
  if (status === 429) {
    throw new Error('Gmail API rate limit exceeded. Please try again later.');
  }
  if (status === 404) {
    throw new Error(resourceId ? `Resource not found: ${resourceId}` : 'Gmail resource not found.');
  }
  throw new Error(`Gmail API error while ${operation}: HTTP ${status}`);
}
