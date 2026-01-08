import { ScreenshotStorage } from './types.js';
import { FileSystemScreenshotStorage } from './filesystem.js';

export class ScreenshotStorageFactory {
  private static instance: ScreenshotStorage | null = null;

  static async create(): Promise<ScreenshotStorage> {
    if (this.instance) {
      return this.instance;
    }

    const rootDir = process.env.SCREENSHOT_STORAGE_PATH;
    const fsStorage = new FileSystemScreenshotStorage(rootDir);
    await fsStorage.init();
    this.instance = fsStorage;

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
