import { describe, it, expect } from 'vitest';
import { sendEmail } from '../../shared/src/pulsemcp-admin-client/lib/send-email.js';

describe('send-email manual tests', () => {
  const apiKey = process.env.PULSEMCP_ADMIN_API_KEY || '4a4c8e02-ca6e-47c5-8233-c52bd01cd3a3';
  const baseUrl = 'https://admin.pulsemcp.com';
  const testEmail = 'tadas412@gmail.com';

  it('should send a test email to specified recipient', async () => {
    const result = await sendEmail(apiKey, baseUrl, {
      from_email_address: 'tadas@s.pulsemcp.com',
      from_name: 'Tadas at PulseMCP',
      reply_to_email_address: 'tadas@pulsemcp.com',
      to_email_address: testEmail,
      subject: 'Test Email from MCP Server Manual Test',
      content: `This is a test email sent from the PulseMCP CMS Admin MCP server manual test suite.

This email was sent at: ${new Date().toISOString()}

The purpose of this test is to verify that the email sending functionality is working correctly through the /emails API endpoint.

Best regards,
PulseMCP Team`,
    });

    // Verify the response contains expected fields
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.to_email_address).toBe(testEmail);
    expect(result.subject).toBe('Test Email from MCP Server Manual Test');
    expect(result.sender_provider).toBeDefined();

    console.log('Email sent successfully!');
    console.log('Email ID:', result.id);
    console.log('Sent to:', result.to_email_address);
    console.log('Timestamp:', result.send_timestamp_utc);
  });
});
