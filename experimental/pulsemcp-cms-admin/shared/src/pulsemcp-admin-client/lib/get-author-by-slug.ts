import type { Author } from '../../types.js';

export async function getAuthorBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<Author> {
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

  const author = mockAuthors.find((a) => a.slug === slug);
  if (!author) {
    throw new Error(`Author not found: ${slug}`);
  }

  return author;
}
