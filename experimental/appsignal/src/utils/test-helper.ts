// Test helper utilities for AppSignal

export function formatErrorMessage(error: Error): string {
  return `Error: ${error.message}`;
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

export function isValidApiKey(apiKey: string): boolean {
  return apiKey.length > 0 && /^[a-zA-Z0-9-_]+$/.test(apiKey);
}
