/**
 * Types for the 1Password MCP Server
 */

/**
 * Represents a 1Password vault
 */
export interface OnePasswordVault {
  id: string;
  name: string;
}

/**
 * Raw item from 1Password CLI (may contain additional sensitive fields)
 */
export interface OnePasswordRawItem {
  id: string;
  title: string;
  category: string;
  vault?: {
    id: string;
    name: string;
  };
  tags?: string[];
  additional_information?: string;
  // Other fields that CLI may return
  [key: string]: unknown;
}

/**
 * Represents a 1Password item in list format (safe fields only, no IDs)
 * Item IDs are intentionally omitted to prevent constructing unlock URLs
 * without explicit user action through the 1Password app.
 */
export interface OnePasswordItem {
  title: string;
  category: string;
  vault?: {
    name: string;
  };
  tags?: string[];
}

/**
 * Field in a 1Password item
 */
export interface OnePasswordField {
  id: string;
  type: string;
  purpose?: string;
  label: string;
  value?: string;
  reference?: string;
}

/**
 * Section in a 1Password item
 */
export interface OnePasswordSection {
  id: string;
  label?: string;
}

/**
 * URL associated with a 1Password item
 */
export interface OnePasswordURL {
  label?: string;
  primary?: boolean;
  href: string;
}

/**
 * Full details of a 1Password item (from CLI - internal use only)
 */
export interface OnePasswordItemDetails {
  id: string;
  title: string;
  category: string;
  vault: {
    id: string;
    name: string;
  };
  tags?: string[];
  fields?: OnePasswordField[];
  sections?: OnePasswordSection[];
  urls?: OnePasswordURL[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Sanitized field for API response (no internal IDs)
 */
export interface OnePasswordSafeField {
  type: string;
  purpose?: string;
  label: string;
  value?: string;
}

/**
 * Sanitized item details for API response (no internal IDs)
 * Item IDs are intentionally omitted to prevent constructing unlock URLs
 * without explicit user action through the 1Password app.
 */
export interface OnePasswordSafeItemDetails {
  title: string;
  category: string;
  vault: {
    name: string;
  };
  tags?: string[];
  fields?: OnePasswordSafeField[];
  urls?: OnePasswordURL[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for the 1Password client
 */
export interface IOnePasswordClient {
  /**
   * List all vaults accessible by the service account
   */
  getVaults(): Promise<OnePasswordVault[]>;

  /**
   * Get a specific item by ID or title
   * @param itemId - The item ID or title
   * @param vaultId - Optional vault ID to narrow the search
   */
  getItem(itemId: string, vaultId?: string): Promise<OnePasswordItemDetails>;

  /**
   * List all items in a vault
   * @param vaultId - The vault ID
   */
  listItems(vaultId: string): Promise<OnePasswordItem[]>;

  /**
   * List items with a specific tag
   * @param tag - The tag to filter by
   * @param vaultId - Optional vault ID to narrow the search
   */
  listItemsByTag(tag: string, vaultId?: string): Promise<OnePasswordItem[]>;

  /**
   * Create a new login item
   * @param vaultId - The vault ID to create the item in
   * @param title - The title for the login
   * @param username - The username
   * @param password - The password
   * @param url - Optional URL for the login
   * @param tags - Optional tags for the item
   */
  createLogin(
    vaultId: string,
    title: string,
    username: string,
    password: string,
    url?: string,
    tags?: string[]
  ): Promise<OnePasswordItemDetails>;

  /**
   * Create a new secure note
   * @param vaultId - The vault ID to create the item in
   * @param title - The title for the secure note
   * @param content - The content of the secure note
   * @param tags - Optional tags for the item
   */
  createSecureNote(
    vaultId: string,
    title: string,
    content: string,
    tags?: string[]
  ): Promise<OnePasswordItemDetails>;
}

/**
 * Error thrown when an item is not found
 */
export class OnePasswordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnePasswordNotFoundError';
  }
}

/**
 * Error thrown for authentication issues
 */
export class OnePasswordAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnePasswordAuthenticationError';
  }
}

/**
 * Error thrown for CLI command failures
 */
export class OnePasswordCommandError extends Error {
  constructor(
    message: string,
    public exitCode: number
  ) {
    super(message);
    this.name = 'OnePasswordCommandError';
  }
}
