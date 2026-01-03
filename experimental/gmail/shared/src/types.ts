/**
 * Gmail API Types
 * Based on Gmail API responses
 */

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailPart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers?: EmailHeader[];
  body?: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: EmailPart[];
}

export interface Email {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload?: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers?: EmailHeader[];
    body?: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: EmailPart[];
  };
  sizeEstimate?: number;
}

export interface EmailListItem {
  id: string;
  threadId: string;
}

export interface Label {
  id: string;
  name: string;
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  type?: 'system' | 'user';
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface Thread {
  id: string;
  historyId: string;
  messages?: Email[];
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}
