import { toBase64Url } from './mime-utils.js';

/**
 * Raw messages up to this size are sent inline as base64url JSON (`raw`).
 * Larger ones — in practice, messages with sizeable attachments — go through
 * Gmail's `/upload` URI, which is documented to accept messages up to 35 MB.
 */
export const INLINE_RAW_LIMIT_BYTES = 5 * 1024 * 1024;

/**
 * Sends an RFC 2822 message to a Gmail endpoint that accepts one
 * (messages/send, drafts create/update).
 *
 * @param path - Path below the users/me base, e.g. "/messages/send"
 * @param buildBody - Returns the JSON request body; given the base64url `raw`
 *   when sending inline, or `undefined` to build the metadata-only part of an upload
 */
export async function requestWithRawMessage(
  baseUrl: string,
  path: string,
  method: 'POST' | 'PUT',
  headers: Record<string, string>,
  rawMessage: string,
  buildBody: (raw: string | undefined) => object
): Promise<Response> {
  if (Buffer.byteLength(rawMessage, 'utf-8') <= INLINE_RAW_LIMIT_BYTES) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: JSON.stringify(buildBody(toBase64Url(rawMessage))),
    });
  }

  const uploadUrl = `${baseUrl.replace('/gmail/v1/', '/upload/gmail/v1/')}${path}?uploadType=multipart`;
  const boundary = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(buildBody(undefined))}\r\n` +
    `--${boundary}\r\nContent-Type: message/rfc822\r\n\r\n` +
    `${rawMessage}\r\n` +
    `--${boundary}--`;

  return fetch(uploadUrl, {
    method,
    headers: { ...headers, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}
