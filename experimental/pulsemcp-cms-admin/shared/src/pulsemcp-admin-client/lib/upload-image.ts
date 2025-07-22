import type { ImageUploadResponse } from '../../types.js';

export async function uploadImage(
  apiKey: string,
  baseUrl: string,
  postSlug: string,
  fileName: string,
  fileData: Buffer
): Promise<ImageUploadResponse> {
  const url = new URL('/upload_image', baseUrl);

  // Create form data for multipart upload
  const formData = new FormData();

  // Create a blob from the buffer
  const blob = new Blob([fileData], { type: 'image/png' }); // Default to PNG, adjust as needed

  // Add file to form data
  formData.append('file', blob, fileName);

  // Add folder path that includes the post slug
  formData.append('folder', `newsletter/${postSlug}`);

  // Add the full filepath
  formData.append('filepath', `newsletter/${postSlug}/${fileName}`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      // Don't set Content-Type for FormData - let the browser set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 422) {
      const errorData = await response.text();
      throw new Error(`Validation failed: ${errorData}`);
    }
    throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ImageUploadResponse;
  return data;
}
