export interface EmailResponse {
  id: number;
  sender_provider: string;
  send_timestamp_utc: string;
  from_email_address: string;
  to_email_address: string;
  subject: string;
  content_text: string;
  content_html: string;
  campaign_identifier: string;
  created_at: string;
  updated_at: string;
}

/**
 * Send an email via the PulseMCP Admin API
 */
export async function sendEmail(
  apiKey: string,
  baseUrl: string,
  params: {
    from_email_address: string;
    from_name: string;
    reply_to_email_address: string;
    to_email_address: string;
    subject: string;
    content: string;
  }
): Promise<EmailResponse> {
  const url = new URL('/admin/api/emails', baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-Admin-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: params }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;

    try {
      const errorData = JSON.parse(errorBody);
      if (errorData.errors) {
        errorMessage = Array.isArray(errorData.errors)
          ? errorData.errors.join(', ')
          : JSON.stringify(errorData.errors);
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else {
        errorMessage = errorBody;
      }
    } catch {
      errorMessage = errorBody || `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new Error(`Failed to send email: ${errorMessage}`);
  }

  return response.json() as Promise<EmailResponse>;
}
