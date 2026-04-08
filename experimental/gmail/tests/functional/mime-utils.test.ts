import { describe, it, expect } from 'vitest';
import {
  buildMimeMessage,
  toBase64Url,
  encodeSubject,
} from '../../shared/src/gmail-client/lib/mime-utils.js';

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

    it('should encode non-ASCII subject with RFC 2047', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'PulseMCP x Fieldguide — Engagement Proposal',
        plaintextBody: 'Hello',
      });

      // Should contain RFC 2047 encoded subject, not raw UTF-8
      expect(result).toContain('Subject: =?UTF-8?B?');
      expect(result).not.toContain('Subject: PulseMCP x Fieldguide —');
    });

    it('should not encode ASCII-only subject', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Plain ASCII Subject',
        plaintextBody: 'Hello',
      });

      expect(result).toContain('Subject: Plain ASCII Subject');
      expect(result).not.toContain('=?UTF-8?B?');
    });

    it('should strip leading newlines from plaintext body', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        plaintextBody: '\n\nHello, World!',
      });

      // Body should start immediately after header separator, no leading newlines
      expect(result).toMatch(/charset=utf-8\r\n\r\nHello, World!$/);
    });

    it('should strip leading CRLF from plaintext body', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        plaintextBody: '\r\n\r\nHello, World!',
      });

      expect(result).toMatch(/charset=utf-8\r\n\r\nHello, World!$/);
    });

    it('should strip leading newlines from HTML body', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        htmlBody: '\n<p>Hello</p>',
      });

      expect(result).toMatch(/charset=utf-8\r\n\r\n<p>Hello<\/p>$/);
    });

    it('should strip leading newlines from both bodies in multipart message', () => {
      const result = buildMimeMessage('sender@example.com', {
        to: 'recipient@example.com',
        subject: 'Test',
        plaintextBody: '\nPlain text',
        htmlBody: '\n<p>HTML</p>',
      });

      // Neither body part should have leading newlines
      expect(result).toContain('charset=utf-8\r\n\r\nPlain text');
      expect(result).toContain('charset=utf-8\r\n\r\n<p>HTML</p>');
    });
  });

  describe('encodeSubject', () => {
    it('should return ASCII subjects unchanged', () => {
      expect(encodeSubject('Hello World')).toBe('Hello World');
    });

    it('should encode subjects with em dash', () => {
      const result = encodeSubject('PulseMCP x Fieldguide — Engagement Proposal');
      expect(result).toMatch(/^=\?UTF-8\?B\?.+\?=$/);

      // Verify the encoding decodes back correctly
      const base64Part = result.replace('=?UTF-8?B?', '').replace('?=', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe('PulseMCP x Fieldguide — Engagement Proposal');
    });

    it('should encode subjects with emoji', () => {
      const result = encodeSubject('Hello 🌍 World');
      expect(result).toMatch(/^=\?UTF-8\?B\?.+\?=$/);

      const base64Part = result.replace('=?UTF-8?B?', '').replace('?=', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe('Hello 🌍 World');
    });

    it('should encode subjects with accented characters', () => {
      const result = encodeSubject('Réunion à Paris');
      expect(result).toMatch(/^=\?UTF-8\?B\?.+\?=$/);

      const base64Part = result.replace('=?UTF-8?B?', '').replace('?=', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe('Réunion à Paris');
    });

    it('should encode subjects with CJK characters', () => {
      const result = encodeSubject('会議の議題');
      expect(result).toMatch(/^=\?UTF-8\?B\?.+\?=$/);

      const base64Part = result.replace('=?UTF-8?B?', '').replace('?=', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe('会議の議題');
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
