import { describe, it, expect } from 'vitest';
import { buildMimeMessage, toBase64Url } from '../../shared/src/gmail-client/lib/mime-utils.js';

describe('MIME Utilities', () => {
  describe('buildMimeMessage', () => {
    it('should build a plain text message', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintextBody: 'Hello, World!',
      });

      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('To: recipient@example.com');
      expect(result).toContain('Subject: Test Subject');
      expect(result).toContain('MIME-Version: 1.0');
      expect(result).toContain('Content-Type: text/plain; charset=utf-8');
      expect(result).toContain('Hello, World!');
      expect(result).not.toContain('text/html');
      expect(result).not.toContain('multipart/alternative');
    });

    it('should build an HTML message', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Hello, <b>World</b>!</p>',
      });

      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('To: recipient@example.com');
      expect(result).toContain('Subject: Test Subject');
      expect(result).toContain('MIME-Version: 1.0');
      expect(result).toContain('Content-Type: text/html; charset=utf-8');
      expect(result).toContain('<p>Hello, <b>World</b>!</p>');
      expect(result).not.toContain('text/plain');
      expect(result).not.toContain('multipart/alternative');
    });

    it('should build a multipart/alternative message when both bodies are provided', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintextBody: 'Hello, World!',
        htmlBody: '<p>Hello, <b>World</b>!</p>',
      });

      expect(result).toContain('Content-Type: multipart/alternative; boundary=');
      expect(result).toContain('Content-Type: text/plain; charset=utf-8');
      expect(result).toContain('Content-Type: text/html; charset=utf-8');
      expect(result).toContain('Hello, World!');
      expect(result).toContain('<p>Hello, <b>World</b>!</p>');

      // Verify boundary structure
      const boundaryMatch = result.match(/boundary="([^"]+)"/);
      expect(boundaryMatch).not.toBeNull();
      const boundary = boundaryMatch![1];
      expect(result).toContain(`--${boundary}`);
      expect(result).toContain(`--${boundary}--`);
    });

    it('should include CC header when provided', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        plaintextBody: 'Body',
        cc: 'cc@example.com',
      });

      expect(result).toContain('Cc: cc@example.com');
    });

    it('should include BCC header when provided', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        plaintextBody: 'Body',
        bcc: 'bcc@example.com',
      });

      expect(result).toContain('Bcc: bcc@example.com');
    });

    it('should include In-Reply-To and References headers when provided', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Re: Test',
        plaintextBody: 'Reply body',
        inReplyTo: '<original-msg-id@example.com>',
        references: '<original-msg-id@example.com>',
      });

      expect(result).toContain('In-Reply-To: <original-msg-id@example.com>');
      expect(result).toContain('References: <original-msg-id@example.com>');
    });

    it('should handle empty body when no content is provided', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
      });

      expect(result).toContain('Content-Type: text/plain; charset=utf-8');
      // Should end with headers + empty body
      expect(result).toMatch(/charset=utf-8\r\n\r\n$/);
    });
  });

  describe('toBase64Url', () => {
    it('should encode a string to base64url', () => {
      const result = toBase64Url('Hello, World!');
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ');
      // Should not contain standard base64 characters that are replaced
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });
  });
});
