import { throwForGoogleApiError } from './api-errors.js';
import type { DrivePermission } from '../../types.js';

const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

export interface CreatePermissionOptions {
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'reader' | 'commenter' | 'writer';
  emailAddress?: string;
  domain?: string;
  sendNotificationEmail?: boolean;
}

export async function createPermission(
  headers: Record<string, string>,
  fileId: string,
  options: CreatePermissionOptions
): Promise<DrivePermission> {
  const body: Record<string, unknown> = {
    type: options.type,
    role: options.role,
  };
  if (options.emailAddress) body.emailAddress = options.emailAddress;
  if (options.domain) body.domain = options.domain;

  const params = new URLSearchParams();
  params.set('supportsAllDrives', 'true');
  // Without `fields`, Drive returns only id/type/kind. Request the fields the
  // tool actually surfaces so we can confirm what was created.
  params.set('fields', 'id,type,role,emailAddress,domain');
  if (options.sendNotificationEmail !== undefined) {
    params.set('sendNotificationEmail', String(options.sendNotificationEmail));
  }

  const response = await fetch(
    `${DRIVE_BASE_URL}/${encodeURIComponent(fileId)}/permissions?${params.toString()}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    await throwForGoogleApiError(response, `Create permission on file ${fileId}`);
  }

  return (await response.json()) as DrivePermission;
}
