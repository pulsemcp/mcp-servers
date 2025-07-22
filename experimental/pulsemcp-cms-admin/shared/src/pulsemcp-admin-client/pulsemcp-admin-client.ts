// Export the client interface for use in other modules
export type { IPulseMCPAdminClient } from '../server.js';
export type {
  Post,
  PostsResponse,
  CreatePostParams,
  UpdatePostParams,
  ImageUploadResponse,
} from '../types.js';

// Export individual API functions
export { getPost } from './lib/get-post.js';
export { getPosts } from './lib/get-posts.js';
export { createPost } from './lib/create-post.js';
export { updatePost } from './lib/update-post.js';
export { uploadImage } from './lib/upload-image.js';
export { getAuthors } from './lib/get-authors.js';
export { getAuthorBySlug } from './lib/get-author-by-slug.js';
export { getMCPServerBySlug } from './lib/get-mcp-server-by-slug.js';
export { getMCPClientBySlug } from './lib/get-mcp-client-by-slug.js';

// Export supervisor API functions
export { getPostById } from './lib/get-post-by-id.js';
export { getSupervisorPosts } from './lib/supervisor-get-posts.js';
export { createSupervisorPost } from './lib/supervisor-create-post.js';
export { updateSupervisorPost } from './lib/supervisor-update-post.js';

// Export supervisor types
export type {
  GetSupervisorPostsOptions,
  GetSupervisorPostsResult,
} from './lib/supervisor-get-posts.js';
export type { CreateSupervisorPostInput } from './lib/supervisor-create-post.js';
export type { UpdateSupervisorPostInput } from './lib/supervisor-update-post.js';
