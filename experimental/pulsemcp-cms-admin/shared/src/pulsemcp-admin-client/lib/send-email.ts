import type { SendEmailParams, SendEmailResponse } from '../../types.js';

export async function sendEmail(
  apiKey: string,
  baseUrl: string,
  params: SendEmailParams
): Promise<SendEmailResponse> {
  const url = `${baseUrl}/api/emails`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ email: params }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      const errors = errorData.errors || ['Validation failed'];
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { data: SendEmailResponse };
  return data.data;
}
