/**
 * Utility functions for string truncation and field expansion
 */

const DEFAULT_MAX_LENGTH = 200;
const TRUNCATION_SUFFIX = '... [TRUNCATED - use expand_fields to see full content]';

/**
 * Recursively truncates string values in an object that exceed the max length.
 * Returns a new object with truncated strings and tracks which paths were truncated.
 *
 * @param obj - The object to process
 * @param expandFields - Array of dot-notation paths to exclude from truncation
 * @param maxLength - Maximum string length before truncation
 * @param currentPath - Current path in the object (for internal recursion)
 * @returns Object with truncated strings
 */
export function truncateStrings(
  obj: unknown,
  expandFields: string[] = [],
  maxLength: number = DEFAULT_MAX_LENGTH,
  currentPath: string = ''
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if current path matches any expand field
    if (shouldExpand(currentPath, expandFields)) {
      return obj;
    }
    if (obj.length > maxLength) {
      return obj.substring(0, maxLength) + TRUNCATION_SUFFIX;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      // Also support [] notation for all array elements
      const wildcardPath = currentPath ? `${currentPath}[]` : `[]`;
      return truncateStrings(
        item,
        expandFields,
        maxLength,
        shouldExpand(wildcardPath, expandFields) ? '' : arrayPath
      );
    });
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = truncateStrings(value, expandFields, maxLength, newPath);
    }
    return result;
  }

  // For other types (numbers, booleans, etc.), return as-is
  return obj;
}

/**
 * Checks if a path should be expanded (not truncated).
 * Supports exact matches, prefix matches, and array wildcard notation.
 *
 * Examples:
 *   - "servers[0].server.description" matches "servers[].server.description"
 *   - "server.packages" matches "server.packages"
 *   - "server.packages[0].readme" matches "server.packages[].readme"
 */
function shouldExpand(currentPath: string, expandFields: string[]): boolean {
  if (!currentPath || expandFields.length === 0) {
    return false;
  }

  for (const expandPath of expandFields) {
    // Exact match
    if (currentPath === expandPath) {
      return true;
    }

    // Check if expand path is a prefix (for nested expansion)
    if (currentPath.startsWith(expandPath + '.') || currentPath.startsWith(expandPath + '[')) {
      return true;
    }

    // Convert array indices to wildcards for comparison
    // e.g., "servers[0].server.description" becomes "servers[].server.description"
    const normalizedCurrent = currentPath.replace(/\[\d+\]/g, '[]');
    if (normalizedCurrent === expandPath) {
      return true;
    }

    // Check prefix match with normalized path
    if (
      normalizedCurrent.startsWith(expandPath + '.') ||
      normalizedCurrent.startsWith(expandPath + '[')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Deep clones an object using JSON serialization.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
