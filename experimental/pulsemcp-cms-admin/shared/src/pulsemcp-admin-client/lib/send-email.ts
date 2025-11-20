import type { SendEmailParams, SendEmailResponse } from '../../types.js';

export async function sendEmail(
  apiKey: string,
  baseUrl: string,
  params: SendEmailParams
): Promise<SendEmailResponse> {
  const url = `${baseUrl}/api/emails`;

  const formData = new URLSearchParams();
  formData.append('email[to_email_address]', params.to_email_address);
  formData.append('email[from_email_address]', params.from_email_address);
  formData.append('email[from_name]', params.from_name);
  formData.append('email[reply_to_email_address]', params.reply_to_email_address);
  formData.append('email[subject]', params.subject);
  formData.append('email[content]', params.content);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-API-Key': apiKey,
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send email: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  const data = (await response.json()) as SendEmailResponse;
  return data;
}
