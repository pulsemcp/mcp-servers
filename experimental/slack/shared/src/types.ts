/**
 * Slack API Types
 * Based on Slack Web API responses
 */

export interface Channel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_member: boolean;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members?: number;
  created: number;
  creator?: string;
}

export interface Message {
  type: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  reply_users?: string[];
  reactions?: Reaction[];
  attachments?: Attachment[];
  blocks?: Block[];
  edited?: {
    user: string;
    ts: string;
  };
}

export interface Reaction {
  name: string;
  count: number;
  users: string[];
}

export interface Attachment {
  id?: number;
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface Block {
  type: string;
  block_id?: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: unknown[];
}

export interface ThreadWithReplies {
  messages: Message[];
  has_more: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface User {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  is_bot: boolean;
  is_admin?: boolean;
  profile?: {
    display_name?: string;
    real_name?: string;
    image_48?: string;
    image_72?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  has_more: boolean;
  next_cursor?: string;
}
