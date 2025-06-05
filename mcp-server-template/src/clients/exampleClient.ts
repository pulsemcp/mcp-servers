/**
 * Example client demonstrating the client pattern for business logic
 */
export class ExampleClient {
  private data: Map<string, string>;

  constructor() {
    this.data = new Map();
    // Initialize with some example data
    this.data.set("greeting", "Hello, World!");
    this.data.set("timestamp", new Date().toISOString());
  }

  /**
   * Get a value by key
   */
  getValue(key: string): string | undefined {
    return this.data.get(key);
  }

  /**
   * Set a value
   */
  setValue(key: string, value: string): void {
    this.data.set(key, value);
  }

  /**
   * Get all keys
   */
  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
  }
}