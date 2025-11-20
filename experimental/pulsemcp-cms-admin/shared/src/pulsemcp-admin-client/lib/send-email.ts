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
  const url = new URL('/emails', baseUrl);

  // Create form data for Rails-style parameters
  const formData = new URLSearchParams();
  formData.append('email[from_email_address]', params.from_email_address);
  formData.append('email[from_name]', params.from_name);
  formData.append('email[reply_to_email_address]', params.reply_to_email_address);
  formData.append('email[to_email_address]', params.to_email_address);
  formData.append('email[subject]', params.subject);
  formData.append('email[content]', params.content);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
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
