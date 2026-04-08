import { VideoStorage } from './video-types.js';
import { FileSystemVideoStorage } from './video-filesystem.js';

export class VideoStorageFactory {
  private static instance: VideoStorage | null = null;

  static async create(): Promise<VideoStorage> {
    if (this.instance) {
      return this.instance;
    }

    const rootDir = process.env.VIDEO_STORAGE_PATH;
    const fsStorage = new FileSystemVideoStorage(rootDir);
    await fsStorage.init();
    this.instance = fsStorage;

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
