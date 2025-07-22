import type { Author, AuthorsResponse } from '../../types.js';

export async function getAuthors(
  apiKey: string,
  baseUrl: string,
  params?: {
    search?: string;
    page?: number;
  }
): Promise<AuthorsResponse> {
  // Authors endpoint not yet available in admin API
  // Return mock data for now
  const mockAuthors: Author[] = [
    {
      id: 1,
      name: 'PulseMCP Team',
      slug: 'pulsemcp-team',
      bio: 'The official PulseMCP team',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Sarah Chen',
      slug: 'sarah-chen',
      bio: 'Senior Developer Advocate',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Alex Wong',
      slug: 'alex-wong',
      bio: 'Content Creator',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Filter by search if provided
  let authors = mockAuthors;
  if (params?.search) {
    const search = params.search.toLowerCase();
    authors = mockAuthors.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        a.slug.toLowerCase().includes(search) ||
        (a.bio && a.bio.toLowerCase().includes(search))
    );
  }

  return {
    authors,
    pagination: {
      current_page: params?.page || 1,
      total_pages: 1,
      total_count: authors.length,
    },
  };
}
