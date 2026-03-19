import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  Post,
  PostsResponse,
  CreatePostParams,
  UpdatePostParams,
  ImageUploadResponse,
  Author,
  AuthorsResponse,
  MCPServer,
  MCPClient,
  MCPImplementation,
  MCPImplementationsResponse,
  SaveMCPImplementationParams,
  CreateMCPImplementationParams,
  Provider,
  ProvidersResponse,
  OfficialMirrorQueueStatus,
  OfficialMirrorQueueResponse,
  OfficialMirrorQueueItemDetail,
  OfficialMirrorQueueActionResponse,
  // New REST API types
  UnofficialMirror,
  UnofficialMirrorsResponse,
  CreateUnofficialMirrorParams,
  UpdateUnofficialMirrorParams,
  OfficialMirrorRest,
  OfficialMirrorsResponse,
  Tenant,
  TenantsResponse,
  McpJson,
  McpJsonsResponse,
  CreateMcpJsonParams,
  UpdateMcpJsonParams,
  // Unified MCP Server types
  UnifiedMCPServer,
  UnifiedMCPServersResponse,
  UpdateUnifiedMCPServerParams,
  // Redirect types
  Redirect,
  RedirectsResponse,
  RedirectStatus,
  CreateRedirectParams,
  UpdateRedirectParams,
  // GoodJob types
  GoodJob,
  GoodJobsResponse,
  GoodJobStatus,
  GoodJobCronSchedule,
  GoodJobProcess,
  GoodJobStatistics,
  GoodJobActionResponse,
  GoodJobCleanupResponse,
  // Proctor types
  ProctorRunExamParams,
  ProctorRunExamResponse,
  ProctorSaveResultsParams,
  ProctorSaveResultsResponse,
  ProctorRunsResponse,
  GetProctorRunsParams,
  ProctorMetadataResponse,
  // Discovered URL types
  DiscoveredUrlsResponse,
  MarkDiscoveredUrlProcessedParams,
  MarkDiscoveredUrlProcessedResponse,
  DiscoveredUrlStats,
  // MOZ types
  MozMetricsResponse,
  MozBacklinksResponse,
  MozStoredMetricsResponse,
} from './types.js';

// Static imports for all API client functions (replaces dynamic imports
// which can fail at runtime in some environments due to ESM resolution)
import { getPosts } from './pulsemcp-admin-client/lib/get-posts.js';
import { getPost } from './pulsemcp-admin-client/lib/get-post.js';
import { createPost } from './pulsemcp-admin-client/lib/create-post.js';
import { updatePost } from './pulsemcp-admin-client/lib/update-post.js';
import { uploadImage } from './pulsemcp-admin-client/lib/upload-image.js';
import { getAuthors } from './pulsemcp-admin-client/lib/get-authors.js';
import { getAuthorBySlug } from './pulsemcp-admin-client/lib/get-author-by-slug.js';
import { getAuthorById } from './pulsemcp-admin-client/lib/get-author-by-id.js';
import { getMCPServerBySlug } from './pulsemcp-admin-client/lib/get-mcp-server-by-slug.js';
import { getMCPServerById } from './pulsemcp-admin-client/lib/get-mcp-server-by-id.js';
import { getMCPClientBySlug } from './pulsemcp-admin-client/lib/get-mcp-client-by-slug.js';
import { getMCPClientById } from './pulsemcp-admin-client/lib/get-mcp-client-by-id.js';
import { getMCPImplementationById } from './pulsemcp-admin-client/lib/get-mcp-implementation-by-id.js';
import { searchMCPImplementations } from './pulsemcp-admin-client/lib/search-mcp-implementations.js';
import { getDraftMCPImplementations } from './pulsemcp-admin-client/lib/get-draft-mcp-implementations.js';
import { saveMCPImplementation } from './pulsemcp-admin-client/lib/save-mcp-implementation.js';
import { createMCPImplementation } from './pulsemcp-admin-client/lib/create-mcp-implementation.js';
import { sendEmail } from './pulsemcp-admin-client/lib/send-email.js';
import { searchProviders } from './pulsemcp-admin-client/lib/search-providers.js';
import { getProviderById } from './pulsemcp-admin-client/lib/get-provider-by-id.js';
import { getOfficialMirrorQueueItems } from './pulsemcp-admin-client/lib/get-official-mirror-queue-items.js';
import { getOfficialMirrorQueueItem } from './pulsemcp-admin-client/lib/get-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItem } from './pulsemcp-admin-client/lib/approve-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItemWithoutModifying } from './pulsemcp-admin-client/lib/approve-official-mirror-queue-item-without-modifying.js';
import { rejectOfficialMirrorQueueItem } from './pulsemcp-admin-client/lib/reject-official-mirror-queue-item.js';
import { addOfficialMirrorToRegularQueue } from './pulsemcp-admin-client/lib/add-official-mirror-to-regular-queue.js';
import { unlinkOfficialMirrorQueueItem } from './pulsemcp-admin-client/lib/unlink-official-mirror-queue-item.js';
import { getUnofficialMirrors } from './pulsemcp-admin-client/lib/get-unofficial-mirrors.js';
import { getUnofficialMirror } from './pulsemcp-admin-client/lib/get-unofficial-mirror.js';
import { createUnofficialMirror } from './pulsemcp-admin-client/lib/create-unofficial-mirror.js';
import { updateUnofficialMirror } from './pulsemcp-admin-client/lib/update-unofficial-mirror.js';
import { deleteUnofficialMirror } from './pulsemcp-admin-client/lib/delete-unofficial-mirror.js';
import { getOfficialMirrors } from './pulsemcp-admin-client/lib/get-official-mirrors.js';
import { getOfficialMirror } from './pulsemcp-admin-client/lib/get-official-mirror.js';
import { getTenants } from './pulsemcp-admin-client/lib/get-tenants.js';
import { getTenant } from './pulsemcp-admin-client/lib/get-tenant.js';
import { getMcpJsons } from './pulsemcp-admin-client/lib/get-mcp-jsons.js';
import { getMcpJson } from './pulsemcp-admin-client/lib/get-mcp-json.js';
import { createMcpJson } from './pulsemcp-admin-client/lib/create-mcp-json.js';
import { updateMcpJson } from './pulsemcp-admin-client/lib/update-mcp-json.js';
import { deleteMcpJson } from './pulsemcp-admin-client/lib/delete-mcp-json.js';
import { getUnifiedMCPServers } from './pulsemcp-admin-client/lib/get-unified-mcp-servers.js';
import { getUnifiedMCPServer } from './pulsemcp-admin-client/lib/get-unified-mcp-server.js';
import { updateUnifiedMCPServer } from './pulsemcp-admin-client/lib/update-unified-mcp-server.js';
import { getRedirects } from './pulsemcp-admin-client/lib/get-redirects.js';
import { getRedirect } from './pulsemcp-admin-client/lib/get-redirect.js';
import { createRedirect } from './pulsemcp-admin-client/lib/create-redirect.js';
import { updateRedirect } from './pulsemcp-admin-client/lib/update-redirect.js';
import { deleteRedirect } from './pulsemcp-admin-client/lib/delete-redirect.js';
import { getGoodJobs } from './pulsemcp-admin-client/lib/get-good-jobs.js';
import { getGoodJob } from './pulsemcp-admin-client/lib/get-good-job.js';
import { getGoodJobCronSchedules } from './pulsemcp-admin-client/lib/get-good-job-cron-schedules.js';
import { getGoodJobProcesses } from './pulsemcp-admin-client/lib/get-good-job-processes.js';
import { getGoodJobStatistics } from './pulsemcp-admin-client/lib/get-good-job-statistics.js';
import { retryGoodJob } from './pulsemcp-admin-client/lib/retry-good-job.js';
import { discardGoodJob } from './pulsemcp-admin-client/lib/discard-good-job.js';
import { rescheduleGoodJob } from './pulsemcp-admin-client/lib/reschedule-good-job.js';
import { forceTriggerGoodJobCron } from './pulsemcp-admin-client/lib/force-trigger-good-job-cron.js';
import { cleanupGoodJobs } from './pulsemcp-admin-client/lib/cleanup-good-jobs.js';
import { runExamForMirror } from './pulsemcp-admin-client/lib/run-exam-for-mirror.js';
import { saveResultsForMirror } from './pulsemcp-admin-client/lib/save-results-for-mirror.js';
import { getProctorRuns } from './pulsemcp-admin-client/lib/get-proctor-runs.js';
import { getProctorMetadata } from './pulsemcp-admin-client/lib/get-proctor-metadata.js';
import { getDiscoveredUrls } from './pulsemcp-admin-client/lib/get-discovered-urls.js';
import { markDiscoveredUrlProcessed } from './pulsemcp-admin-client/lib/mark-discovered-url-processed.js';
import { getDiscoveredUrlStats } from './pulsemcp-admin-client/lib/get-discovered-url-stats.js';
import { getMozMetrics } from './pulsemcp-admin-client/lib/get-moz-metrics.js';
import { getMozBacklinks } from './pulsemcp-admin-client/lib/get-moz-backlinks.js';
import { getMozStoredMetrics } from './pulsemcp-admin-client/lib/get-moz-stored-metrics.js';

// PulseMCP Admin API client interface
export interface IPulseMCPAdminClient {
  getPosts(params?: {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
  }): Promise<PostsResponse>;

  getPost(slug: string): Promise<Post>;

  createPost(params: CreatePostParams): Promise<Post>;

  updatePost(slug: string, params: UpdatePostParams): Promise<Post>;

  uploadImage(postSlug: string, fileName: string, fileData: Buffer): Promise<ImageUploadResponse>;

  getAuthors(params?: { search?: string; page?: number }): Promise<AuthorsResponse>;

  getAuthorBySlug(slug: string): Promise<Author>;

  getAuthorById(id: number): Promise<Author | null>;

  getMCPServerBySlug(slug: string): Promise<MCPServer>;

  getMCPServerById(id: number): Promise<MCPServer | null>;

  getMCPClientBySlug(slug: string): Promise<MCPClient>;

  getMCPClientById(id: number): Promise<MCPClient | null>;

  getMCPImplementationById(id: number): Promise<MCPImplementation | null>;

  searchMCPImplementations(params: {
    query: string;
    type?: 'server' | 'client' | 'all';
    status?: 'draft' | 'live' | 'archived' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<MCPImplementationsResponse>;

  getDraftMCPImplementations(params?: {
    page?: number;
    search?: string;
  }): Promise<MCPImplementationsResponse>;

  saveMCPImplementation(
    id: number,
    params: SaveMCPImplementationParams
  ): Promise<MCPImplementation>;

  createMCPImplementation(params: CreateMCPImplementationParams): Promise<MCPImplementation>;

  sendEmail(params: {
    from_email_address: string;
    from_name: string;
    reply_to_email_address: string;
    to_email_address: string;
    subject: string;
    content: string;
  }): Promise<{
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
  }>;

  searchProviders(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<ProvidersResponse>;

  getProviderById(id: number): Promise<Provider | null>;

  // Official Mirror Queue methods
  getOfficialMirrorQueueItems(params?: {
    status?: OfficialMirrorQueueStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorQueueResponse>;

  getOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueItemDetail>;

  approveOfficialMirrorQueueItem(
    id: number,
    mcpServerSlug: string
  ): Promise<OfficialMirrorQueueActionResponse>;

  approveOfficialMirrorQueueItemWithoutModifying(
    id: number
  ): Promise<OfficialMirrorQueueActionResponse>;

  rejectOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse>;

  addOfficialMirrorToRegularQueue(id: number): Promise<OfficialMirrorQueueActionResponse>;

  unlinkOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse>;

  // Unofficial Mirror REST API methods
  getUnofficialMirrors(params?: {
    q?: string;
    mcp_server_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<UnofficialMirrorsResponse>;

  getUnofficialMirror(id: number): Promise<UnofficialMirror>;

  createUnofficialMirror(params: CreateUnofficialMirrorParams): Promise<UnofficialMirror>;

  updateUnofficialMirror(
    id: number,
    params: UpdateUnofficialMirrorParams
  ): Promise<UnofficialMirror>;

  deleteUnofficialMirror(id: number): Promise<{ success: boolean; message: string }>;

  // Official Mirror REST API methods (read-only)
  getOfficialMirrors(params?: {
    q?: string;
    mcp_server_id?: number;
    status?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorsResponse>;

  getOfficialMirror(id: number): Promise<OfficialMirrorRest>;

  // Tenant REST API methods (read-only)
  getTenants(params?: {
    q?: string;
    is_admin?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TenantsResponse>;

  getTenant(idOrSlug: number | string): Promise<Tenant>;

  // MCP JSON REST API methods
  getMcpJsons(params?: {
    unofficial_mirror_id?: number;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<McpJsonsResponse>;

  getMcpJson(id: number): Promise<McpJson>;

  createMcpJson(params: CreateMcpJsonParams): Promise<McpJson>;

  updateMcpJson(id: number, params: UpdateMcpJsonParams): Promise<McpJson>;

  deleteMcpJson(id: number): Promise<{ success: boolean; message: string }>;

  // Unified MCP Server methods (abstracted interface)
  getUnifiedMCPServers(params?: {
    q?: string;
    status?: 'draft' | 'live' | 'archived' | 'all';
    classification?: 'official' | 'community' | 'reference';
    limit?: number;
    offset?: number;
  }): Promise<UnifiedMCPServersResponse>;

  getUnifiedMCPServer(slug: string): Promise<UnifiedMCPServer>;

  updateUnifiedMCPServer(
    implementationId: number,
    params: UpdateUnifiedMCPServerParams
  ): Promise<UnifiedMCPServer>;

  // Redirect REST API methods
  getRedirects(params?: {
    q?: string;
    status?: RedirectStatus;
    limit?: number;
    offset?: number;
  }): Promise<RedirectsResponse>;

  getRedirect(id: number): Promise<Redirect>;

  createRedirect(params: CreateRedirectParams): Promise<Redirect>;

  updateRedirect(id: number, params: UpdateRedirectParams): Promise<Redirect>;

  deleteRedirect(id: number): Promise<{ success: boolean; message: string }>;

  // GoodJob REST API methods
  getGoodJobs(params?: {
    queue_name?: string;
    status?: GoodJobStatus;
    job_class?: string;
    after?: string;
    before?: string;
    limit?: number;
    offset?: number;
  }): Promise<GoodJobsResponse>;

  getGoodJob(id: string): Promise<GoodJob>;

  getGoodJobCronSchedules(): Promise<GoodJobCronSchedule[]>;

  getGoodJobProcesses(): Promise<GoodJobProcess[]>;

  getGoodJobStatistics(): Promise<GoodJobStatistics>;

  retryGoodJob(id: string): Promise<GoodJobActionResponse>;

  discardGoodJob(id: string): Promise<GoodJobActionResponse>;

  rescheduleGoodJob(id: string, scheduledAt: string): Promise<GoodJobActionResponse>;

  forceTriggerGoodJobCron(cronKey: string): Promise<GoodJobActionResponse>;

  cleanupGoodJobs(params?: {
    older_than_days?: number;
    status?: GoodJobStatus;
  }): Promise<GoodJobCleanupResponse>;

  // Proctor REST API methods
  runExamForMirror(params: ProctorRunExamParams): Promise<ProctorRunExamResponse>;

  saveResultsForMirror(params: ProctorSaveResultsParams): Promise<ProctorSaveResultsResponse>;

  getProctorRuns(params?: GetProctorRunsParams): Promise<ProctorRunsResponse>;

  getProctorMetadata(): Promise<ProctorMetadataResponse>;

  // Discovered URL REST API methods
  getDiscoveredUrls(params?: {
    status?: 'pending' | 'processed' | 'needs_indexing' | 'all';
    page?: number;
    per_page?: number;
  }): Promise<DiscoveredUrlsResponse>;

  markDiscoveredUrlProcessed(
    params: MarkDiscoveredUrlProcessedParams
  ): Promise<MarkDiscoveredUrlProcessedResponse>;

  getDiscoveredUrlStats(): Promise<DiscoveredUrlStats>;

  // MOZ REST API methods
  getMozMetrics(params: {
    url: string;
    scope?: 'url' | 'domain' | 'subdomain';
  }): Promise<MozMetricsResponse>;

  getMozBacklinks(params: {
    url: string;
    scope?: 'url' | 'domain' | 'subdomain';
    limit?: number;
  }): Promise<MozBacklinksResponse>;

  getMozStoredMetrics(params: {
    server_id: string;
    canonical_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<MozStoredMetricsResponse>;
}

// PulseMCP Admin API client implementation
export class PulseMCPAdminClient implements IPulseMCPAdminClient {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || 'https://admin.pulsemcp.com';
  }

  async getPosts(params?: {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
  }): Promise<PostsResponse> {
    return getPosts(this.apiKey, this.baseUrl, params);
  }

  async getPost(slug: string): Promise<Post> {
    return getPost(this.apiKey, this.baseUrl, slug);
  }

  async createPost(params: CreatePostParams): Promise<Post> {
    return createPost(this.apiKey, this.baseUrl, params);
  }

  async updatePost(slug: string, params: UpdatePostParams): Promise<Post> {
    return updatePost(this.apiKey, this.baseUrl, slug, params);
  }

  async uploadImage(
    postSlug: string,
    fileName: string,
    fileData: Buffer
  ): Promise<ImageUploadResponse> {
    return uploadImage(this.apiKey, this.baseUrl, postSlug, fileName, fileData);
  }

  async getAuthors(params?: { search?: string; page?: number }): Promise<AuthorsResponse> {
    return getAuthors(this.apiKey, this.baseUrl, params);
  }

  async getAuthorBySlug(slug: string): Promise<Author> {
    return getAuthorBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getAuthorById(id: number): Promise<Author | null> {
    return getAuthorById(this.apiKey, this.baseUrl, id);
  }

  async getMCPServerBySlug(slug: string): Promise<MCPServer> {
    return getMCPServerBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getMCPServerById(id: number): Promise<MCPServer | null> {
    return getMCPServerById(this.apiKey, this.baseUrl, id);
  }

  async getMCPClientBySlug(slug: string): Promise<MCPClient> {
    return getMCPClientBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getMCPClientById(id: number): Promise<MCPClient | null> {
    return getMCPClientById(this.apiKey, this.baseUrl, id);
  }

  async getMCPImplementationById(id: number): Promise<MCPImplementation | null> {
    return getMCPImplementationById(this.apiKey, this.baseUrl, id);
  }

  async searchMCPImplementations(params: {
    query: string;
    type?: 'server' | 'client' | 'all';
    status?: 'draft' | 'live' | 'archived' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<MCPImplementationsResponse> {
    return searchMCPImplementations(this.apiKey, this.baseUrl, params);
  }

  async getDraftMCPImplementations(params?: {
    page?: number;
    search?: string;
  }): Promise<MCPImplementationsResponse> {
    return getDraftMCPImplementations(this.apiKey, this.baseUrl, params);
  }

  async saveMCPImplementation(
    id: number,
    params: SaveMCPImplementationParams
  ): Promise<MCPImplementation> {
    return saveMCPImplementation(this.apiKey, this.baseUrl, id, params);
  }

  async createMCPImplementation(params: CreateMCPImplementationParams): Promise<MCPImplementation> {
    return createMCPImplementation(this.apiKey, this.baseUrl, params);
  }

  async sendEmail(params: {
    from_email_address: string;
    from_name: string;
    reply_to_email_address: string;
    to_email_address: string;
    subject: string;
    content: string;
  }): Promise<{
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
  }> {
    return sendEmail(this.apiKey, this.baseUrl, params);
  }

  async searchProviders(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<ProvidersResponse> {
    return searchProviders(this.apiKey, this.baseUrl, params);
  }

  async getProviderById(id: number): Promise<Provider | null> {
    return getProviderById(this.apiKey, this.baseUrl, id);
  }

  // Official Mirror Queue methods
  async getOfficialMirrorQueueItems(params?: {
    status?: OfficialMirrorQueueStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorQueueResponse> {
    return getOfficialMirrorQueueItems(this.apiKey, this.baseUrl, params);
  }

  async getOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueItemDetail> {
    return getOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
  }

  async approveOfficialMirrorQueueItem(
    id: number,
    mcpServerSlug: string
  ): Promise<OfficialMirrorQueueActionResponse> {
    return approveOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id, mcpServerSlug);
  }

  async approveOfficialMirrorQueueItemWithoutModifying(
    id: number
  ): Promise<OfficialMirrorQueueActionResponse> {
    return approveOfficialMirrorQueueItemWithoutModifying(this.apiKey, this.baseUrl, id);
  }

  async rejectOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse> {
    return rejectOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
  }

  async addOfficialMirrorToRegularQueue(id: number): Promise<OfficialMirrorQueueActionResponse> {
    return addOfficialMirrorToRegularQueue(this.apiKey, this.baseUrl, id);
  }

  async unlinkOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse> {
    return unlinkOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
  }

  // Unofficial Mirror REST API methods
  async getUnofficialMirrors(params?: {
    q?: string;
    mcp_server_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<UnofficialMirrorsResponse> {
    return getUnofficialMirrors(this.apiKey, this.baseUrl, params);
  }

  async getUnofficialMirror(id: number): Promise<UnofficialMirror> {
    return getUnofficialMirror(this.apiKey, this.baseUrl, id);
  }

  async createUnofficialMirror(params: CreateUnofficialMirrorParams): Promise<UnofficialMirror> {
    return createUnofficialMirror(this.apiKey, this.baseUrl, params);
  }

  async updateUnofficialMirror(
    id: number,
    params: UpdateUnofficialMirrorParams
  ): Promise<UnofficialMirror> {
    return updateUnofficialMirror(this.apiKey, this.baseUrl, id, params);
  }

  async deleteUnofficialMirror(id: number): Promise<{ success: boolean; message: string }> {
    return deleteUnofficialMirror(this.apiKey, this.baseUrl, id);
  }

  // Official Mirror REST API methods (read-only)
  async getOfficialMirrors(params?: {
    q?: string;
    mcp_server_id?: number;
    status?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorsResponse> {
    return getOfficialMirrors(this.apiKey, this.baseUrl, params);
  }

  async getOfficialMirror(id: number): Promise<OfficialMirrorRest> {
    return getOfficialMirror(this.apiKey, this.baseUrl, id);
  }

  // Tenant REST API methods (read-only)
  async getTenants(params?: {
    q?: string;
    is_admin?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TenantsResponse> {
    return getTenants(this.apiKey, this.baseUrl, params);
  }

  async getTenant(idOrSlug: number | string): Promise<Tenant> {
    return getTenant(this.apiKey, this.baseUrl, idOrSlug);
  }

  // MCP JSON REST API methods
  async getMcpJsons(params?: {
    unofficial_mirror_id?: number;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<McpJsonsResponse> {
    return getMcpJsons(this.apiKey, this.baseUrl, params);
  }

  async getMcpJson(id: number): Promise<McpJson> {
    return getMcpJson(this.apiKey, this.baseUrl, id);
  }

  async createMcpJson(params: CreateMcpJsonParams): Promise<McpJson> {
    return createMcpJson(this.apiKey, this.baseUrl, params);
  }

  async updateMcpJson(id: number, params: UpdateMcpJsonParams): Promise<McpJson> {
    return updateMcpJson(this.apiKey, this.baseUrl, id, params);
  }

  async deleteMcpJson(id: number): Promise<{ success: boolean; message: string }> {
    return deleteMcpJson(this.apiKey, this.baseUrl, id);
  }

  // Unified MCP Server methods (abstracted interface)
  async getUnifiedMCPServers(params?: {
    q?: string;
    status?: 'draft' | 'live' | 'archived' | 'all';
    classification?: 'official' | 'community' | 'reference';
    limit?: number;
    offset?: number;
  }): Promise<UnifiedMCPServersResponse> {
    return getUnifiedMCPServers(this.apiKey, this.baseUrl, params);
  }

  async getUnifiedMCPServer(slug: string): Promise<UnifiedMCPServer> {
    return getUnifiedMCPServer(this.apiKey, this.baseUrl, slug);
  }

  async updateUnifiedMCPServer(
    implementationId: number,
    params: UpdateUnifiedMCPServerParams
  ): Promise<UnifiedMCPServer> {
    return updateUnifiedMCPServer(this.apiKey, this.baseUrl, implementationId, params);
  }

  // Redirect REST API methods
  async getRedirects(params?: {
    q?: string;
    status?: RedirectStatus;
    limit?: number;
    offset?: number;
  }): Promise<RedirectsResponse> {
    return getRedirects(this.apiKey, this.baseUrl, params);
  }

  async getRedirect(id: number): Promise<Redirect> {
    return getRedirect(this.apiKey, this.baseUrl, id);
  }

  async createRedirect(params: CreateRedirectParams): Promise<Redirect> {
    return createRedirect(this.apiKey, this.baseUrl, params);
  }

  async updateRedirect(id: number, params: UpdateRedirectParams): Promise<Redirect> {
    return updateRedirect(this.apiKey, this.baseUrl, id, params);
  }

  async deleteRedirect(id: number): Promise<{ success: boolean; message: string }> {
    return deleteRedirect(this.apiKey, this.baseUrl, id);
  }

  // GoodJob REST API methods
  async getGoodJobs(params?: {
    queue_name?: string;
    status?: GoodJobStatus;
    job_class?: string;
    after?: string;
    before?: string;
    limit?: number;
    offset?: number;
  }): Promise<GoodJobsResponse> {
    return getGoodJobs(this.apiKey, this.baseUrl, params);
  }

  async getGoodJob(id: string): Promise<GoodJob> {
    return getGoodJob(this.apiKey, this.baseUrl, id);
  }

  async getGoodJobCronSchedules(): Promise<GoodJobCronSchedule[]> {
    return getGoodJobCronSchedules(this.apiKey, this.baseUrl);
  }

  async getGoodJobProcesses(): Promise<GoodJobProcess[]> {
    return getGoodJobProcesses(this.apiKey, this.baseUrl);
  }

  async getGoodJobStatistics(): Promise<GoodJobStatistics> {
    return getGoodJobStatistics(this.apiKey, this.baseUrl);
  }

  async retryGoodJob(id: string): Promise<GoodJobActionResponse> {
    return retryGoodJob(this.apiKey, this.baseUrl, id);
  }

  async discardGoodJob(id: string): Promise<GoodJobActionResponse> {
    return discardGoodJob(this.apiKey, this.baseUrl, id);
  }

  async rescheduleGoodJob(id: string, scheduledAt: string): Promise<GoodJobActionResponse> {
    return rescheduleGoodJob(this.apiKey, this.baseUrl, id, scheduledAt);
  }

  async forceTriggerGoodJobCron(cronKey: string): Promise<GoodJobActionResponse> {
    return forceTriggerGoodJobCron(this.apiKey, this.baseUrl, cronKey);
  }

  async cleanupGoodJobs(params?: {
    older_than_days?: number;
    status?: GoodJobStatus;
  }): Promise<GoodJobCleanupResponse> {
    return cleanupGoodJobs(this.apiKey, this.baseUrl, params);
  }

  // Proctor REST API methods
  async runExamForMirror(params: ProctorRunExamParams): Promise<ProctorRunExamResponse> {
    return runExamForMirror(this.apiKey, this.baseUrl, params);
  }

  async saveResultsForMirror(
    params: ProctorSaveResultsParams
  ): Promise<ProctorSaveResultsResponse> {
    return saveResultsForMirror(this.apiKey, this.baseUrl, params);
  }

  async getProctorRuns(params?: GetProctorRunsParams): Promise<ProctorRunsResponse> {
    return getProctorRuns(this.apiKey, this.baseUrl, params);
  }

  async getProctorMetadata(): Promise<ProctorMetadataResponse> {
    return getProctorMetadata(this.apiKey, this.baseUrl);
  }

  // Discovered URL REST API methods
  async getDiscoveredUrls(params?: {
    status?: 'pending' | 'processed' | 'needs_indexing' | 'all';
    page?: number;
    per_page?: number;
  }): Promise<DiscoveredUrlsResponse> {
    return getDiscoveredUrls(this.apiKey, this.baseUrl, params);
  }

  async markDiscoveredUrlProcessed(
    params: MarkDiscoveredUrlProcessedParams
  ): Promise<MarkDiscoveredUrlProcessedResponse> {
    return markDiscoveredUrlProcessed(this.apiKey, this.baseUrl, params);
  }

  async getDiscoveredUrlStats(): Promise<DiscoveredUrlStats> {
    return getDiscoveredUrlStats(this.apiKey, this.baseUrl);
  }

  // MOZ REST API methods
  async getMozMetrics(params: {
    url: string;
    scope?: 'url' | 'domain' | 'subdomain';
  }): Promise<MozMetricsResponse> {
    return getMozMetrics(this.apiKey, this.baseUrl, params);
  }

  async getMozBacklinks(params: {
    url: string;
    scope?: 'url' | 'domain' | 'subdomain';
    limit?: number;
  }): Promise<MozBacklinksResponse> {
    return getMozBacklinks(this.apiKey, this.baseUrl, params);
  }

  async getMozStoredMetrics(params: {
    server_id: string;
    canonical_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<MozStoredMetricsResponse> {
    return getMozStoredMetrics(this.apiKey, this.baseUrl, params);
  }
}

export type ClientFactory = () => IPulseMCPAdminClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'pulsemcp-cms-admin',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        // Get configuration from environment variables
        const apiKey = process.env.PULSEMCP_ADMIN_API_KEY;
        const baseUrl = process.env.PULSEMCP_ADMIN_API_URL;

        if (!apiKey) {
          throw new Error('PULSEMCP_ADMIN_API_KEY environment variable must be configured');
        }

        return new PulseMCPAdminClient(apiKey, baseUrl);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
