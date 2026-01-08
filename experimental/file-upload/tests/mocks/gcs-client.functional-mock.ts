import { vi } from 'vitest';
import type { IGCSClient } from '../../shared/src/gcs-client/gcs-client.js';
import type {
  GCSConfig,
  UploadResult,
  UploadOptions,
  FileInfo,
  ListResult,
  DownloadOptions,
  ModifyOptions,
} from '../../shared/src/types.js';

/**
 * Functional mock for unit testing with Vitest spy capabilities
 */
export function createFunctionalMockGCSClient(): IGCSClient & {
  upload: ReturnType<typeof vi.fn>;
  uploadFile: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  getInfo: ReturnType<typeof vi.fn>;
  modify: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  getConfig: ReturnType<typeof vi.fn>;
} {
  const mockConfig: GCSConfig = {
    bucket: 'test-bucket',
    rootPath: 'test-uploads',
    makePublic: true,
  };

  const mockFileInfo: FileInfo = {
    path: 'test-file.png',
    size: 1234,
    contentType: 'image/png',
    updatedAt: new Date().toISOString(),
    isPublic: true,
    url: 'https://storage.googleapis.com/test-bucket/test-uploads/test-file.png',
  };

  return {
    upload: vi.fn().mockImplementation(async (_data: Buffer | string, options?: UploadOptions) => {
      const filePath = options?.path || 'test-file.png';
      return {
        ...mockFileInfo,
        path: filePath,
        url: `https://storage.googleapis.com/test-bucket/test-uploads/${filePath}`,
        contentType: options?.contentType || 'image/png',
        isPublic: options?.makePublic ?? mockConfig.makePublic ?? false,
      } as UploadResult;
    }),

    uploadFile: vi.fn().mockImplementation(async (localPath: string, options?: UploadOptions) => {
      const nodePath = await import('path');
      const filePath = options?.path || nodePath.basename(localPath);
      return {
        ...mockFileInfo,
        path: filePath,
        url: `https://storage.googleapis.com/test-bucket/test-uploads/${filePath}`,
        contentType: options?.contentType || 'image/png',
        isPublic: options?.makePublic ?? mockConfig.makePublic ?? false,
      } as UploadResult;
    }),

    download: vi
      .fn()
      .mockImplementation(
        async (
          path: string,
          options?: DownloadOptions
        ): Promise<{ content: string; info: FileInfo }> => {
          return {
            content: options?.asBase64 ? 'dGVzdCBjb250ZW50' : 'test content',
            info: {
              ...mockFileInfo,
              path,
              url: `https://storage.googleapis.com/test-bucket/test-uploads/${path}`,
            },
          };
        }
      ),

    list: vi.fn().mockImplementation(async (): Promise<ListResult> => {
      return {
        files: [mockFileInfo],
        directories: [],
      };
    }),

    getInfo: vi.fn().mockImplementation(async (path: string): Promise<FileInfo> => {
      return {
        ...mockFileInfo,
        path,
        url: `https://storage.googleapis.com/test-bucket/test-uploads/${path}`,
      };
    }),

    modify: vi
      .fn()
      .mockImplementation(async (path: string, options: ModifyOptions): Promise<FileInfo> => {
        return {
          ...mockFileInfo,
          path,
          url: `https://storage.googleapis.com/test-bucket/test-uploads/${path}`,
          isPublic: options.makePublic ?? !options.makePrivate ?? mockFileInfo.isPublic,
          contentType: options.contentType ?? mockFileInfo.contentType,
        };
      }),

    delete: vi.fn().mockResolvedValue(undefined),

    exists: vi.fn().mockResolvedValue(true),

    getConfig: vi.fn().mockReturnValue(mockConfig),
  };
}
