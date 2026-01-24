/**
 * Utility functions for string truncation and field expansion
 */

const DEFAULT_STRING_MAX_LENGTH = 200;
const DEEP_VALUE_MAX_LENGTH = 500;
const DEPTH_THRESHOLD = 5; // Start truncating complex values at depth 5 (so depth 4 keys are visible)

/**
 * Creates truncation message with specific path for expansion.
 * Returns a complete message (not a suffix) to ensure JSON validity.
 */
function getTruncationMessage(path: string, type: 'string' | 'deep'): string {
  const wildcardPath = path.replace(/\[\d+\]/g, '[]');
  if (type === 'string') {
    return `[TRUNCATED - use expand_fields: ["${wildcardPath}"] to see full content]`;
  }
  return `[DEEP OBJECT TRUNCATED - use expand_fields: ["${wildcardPath}"] to see full content]`;
}

/**
 * Calculates the depth of a path.
 * Depth is counted as: each key access and each array index access.
 * Examples:
 *   - "servers" = depth 1
 *   - "servers[0]" = depth 2
 *   - "servers[0].server" = depth 3
 *   - "servers[0].server.packages" = depth 4
 *   - "servers[0].server.packages[0]" = depth 5
 *   - "servers[0]._meta" = depth 3
 *   - "servers[0]._meta.com.pulsemcp/server" = depth 4
 *   - "servers[0]._meta.com.pulsemcp/server.tools" = depth 5
 */
function getDepth(path: string): number {
  if (!path) return 0;

  let depth = 0;
  let i = 0;

  while (i < path.length) {
    // Skip to the next segment
    if (path[i] === '.') {
      i++;
      continue;
    }

    if (path[i] === '[') {
      // Array index or bracket notation - count as one depth level
      depth++;
      // Skip past the closing bracket
      const closeBracket = path.indexOf(']', i);
      if (closeBracket === -1) break;
      i = closeBracket + 1;
    } else {
      // Key access - count as one depth level
      depth++;
      // Skip to the next delimiter
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        i++;
      }
    }
  }

  return depth;
}

/**
 * Recursively truncates values in an object:
 * 1. Strings longer than 200 chars are truncated
 * 2. At depth >= 5, any value serializing to > 500 chars is truncated
 *
 * @param obj - The object to process
 * @param expandFields - Array of dot-notation paths to exclude from truncation
 * @param currentPath - Current path in the object (for internal recursion)
 * @returns Object with truncated values
 */
export function truncateStrings(
  obj: unknown,
  expandFields: string[] = [],
  currentPath: string = ''
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const currentDepth = getDepth(currentPath);

  // Check if this path should be expanded (skip all truncation)
  if (shouldExpand(currentPath, expandFields)) {
    // Still need to recurse for nested paths that might not be expanded
    if (Array.isArray(obj)) {
      return obj.map((item, index) => {
        const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        return truncateStrings(item, expandFields, arrayPath);
      });
    }
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        result[key] = truncateStrings(value, expandFields, newPath);
      }
      return result;
    }
    return obj;
  }

  // At depth >= DEPTH_THRESHOLD, check if the serialized value is too large
  if (currentDepth >= DEPTH_THRESHOLD && (typeof obj === 'object' || Array.isArray(obj))) {
    const serialized = JSON.stringify(obj);
    if (serialized.length > DEEP_VALUE_MAX_LENGTH) {
      // Replace the entire value with a truncation message (keeps JSON valid)
      return getTruncationMessage(currentPath, 'deep');
    }
  }

  // Handle strings - truncate if too long
  if (typeof obj === 'string') {
    if (obj.length > DEFAULT_STRING_MAX_LENGTH) {
      // Replace with truncation message (keeps JSON valid)
      return getTruncationMessage(currentPath, 'string');
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      return truncateStrings(item, expandFields, arrayPath);
    });
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = truncateStrings(value, expandFields, newPath);
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
