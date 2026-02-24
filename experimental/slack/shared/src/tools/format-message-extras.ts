import type { Message } from '../types.js';

/**
 * Formats attachment and file information from a Slack message into markdown text.
 * Returns an empty string if the message has no attachments or files.
 */
export function formatMessageExtras(msg: Message): string {
  let output = '';

  if (msg.attachments && msg.attachments.length > 0) {
    for (const att of msg.attachments) {
      const parts: string[] = [];

      if (att.pretext) {
        parts.push(att.pretext);
      }

      // Title with optional link
      if (att.title) {
        parts.push(att.title_link ? `[${att.title}](${att.title_link})` : att.title);
      }

      // Service/source info for unfurled links
      if (att.service_name) {
        parts.push(`(${att.service_name})`);
      }

      if (att.author_name) {
        parts.push(`By: ${att.author_name}`);
      }

      if (att.text) {
        parts.push(att.text);
      }

      // Image URL (unfurled preview or inline image)
      if (att.image_url) {
        parts.push(`Image: ${att.image_url}`);
      } else if (att.thumb_url) {
        parts.push(`Thumbnail: ${att.thumb_url}`);
      }

      // Original URL for unfurled links
      if (att.from_url) {
        parts.push(`URL: ${att.from_url}`);
      }

      if (parts.length > 0) {
        output += `  📎 Attachment: ${parts.join(' | ')}\n`;
      }
    }
  }

  if (msg.files && msg.files.length > 0) {
    for (const file of msg.files) {
      const parts: string[] = [];

      const name = file.name || file.title || 'Untitled file';
      parts.push(name);

      if (file.mimetype) {
        parts.push(`(${file.mimetype})`);
      }

      if (file.size) {
        parts.push(formatFileSize(file.size));
      }

      if (file.permalink) {
        parts.push(`Link: ${file.permalink}`);
      } else if (file.url_private) {
        parts.push(`Link: ${file.url_private}`);
      }

      output += `  📄 File: ${parts.join(' | ')}\n`;
    }
  }

  return output;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
