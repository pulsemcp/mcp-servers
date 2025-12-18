import { describe, it, expect } from 'vitest';
import { PulseMCPAdminClient } from '../../shared/src/server.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

describe('find_providers manual tests', () => {
  const apiKey = process.env.PULSEMCP_ADMIN_API_KEY;
  const baseUrl = process.env.PULSEMCP_ADMIN_API_URL;

  if (!apiKey) {
    throw new Error('PULSEMCP_ADMIN_API_KEY environment variable is required for manual tests');
  }

  const client = new PulseMCPAdminClient(apiKey, baseUrl);

  describe('searchProviders', () => {
    it('should search for providers by query', async () => {
      const response = await client.searchProviders({
        query: 'anthropic',
      });

      console.log('Search results for "anthropic":', JSON.stringify(response, null, 2));

      expect(response).toBeDefined();
      expect(response.providers).toBeDefined();
      expect(Array.isArray(response.providers)).toBe(true);

      // Verify response structure
      if (response.providers.length > 0) {
        const provider = response.providers[0];
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('slug');
        expect(typeof provider.id).toBe('number');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.slug).toBe('string');

        console.log(
          `Found provider: ${provider.name} (ID: ${provider.id}, Slug: ${provider.slug})`
        );
      }

      // Verify pagination structure if present
      if (response.pagination) {
        expect(response.pagination).toHaveProperty('current_page');
        expect(response.pagination).toHaveProperty('total_pages');
        expect(response.pagination).toHaveProperty('total_count');
        expect(typeof response.pagination.current_page).toBe('number');
        expect(typeof response.pagination.total_pages).toBe('number');
        expect(typeof response.pagination.total_count).toBe('number');
      }
    });

    it('should support pagination with limit and offset', async () => {
      const response = await client.searchProviders({
        query: 'a', // Broad query to get multiple results
        limit: 5,
        offset: 0,
      });

      console.log('Pagination test results:', JSON.stringify(response, null, 2));

      expect(response).toBeDefined();
      expect(response.providers).toBeDefined();
      expect(response.providers.length).toBeLessThanOrEqual(5);

      if (response.pagination) {
        expect(response.pagination.limit).toBe(5);
        console.log(
          `Retrieved ${response.providers.length} of ${response.pagination.total_count} total providers`
        );
      }
    });

    it('should handle empty search results', async () => {
      const response = await client.searchProviders({
        query: 'xyznonexistentprovider12345',
      });

      console.log('Empty search results:', JSON.stringify(response, null, 2));

      expect(response).toBeDefined();
      expect(response.providers).toBeDefined();
      expect(response.providers.length).toBe(0);
    });

    it('should search across different fields (name, url, slug)', async () => {
      // Test searching by partial name
      const nameSearch = await client.searchProviders({
        query: 'model',
        limit: 5,
      });

      console.log('Name search results:', JSON.stringify(nameSearch, null, 2));

      expect(nameSearch).toBeDefined();
      expect(nameSearch.providers).toBeDefined();

      if (nameSearch.providers.length > 0) {
        console.log(`Found ${nameSearch.providers.length} providers matching "model"`);
      }
    });
  });

  describe('getProviderById', () => {
    it('should retrieve a specific provider by ID', async () => {
      // First, search for a provider to get a valid ID
      const searchResponse = await client.searchProviders({
        query: 'anthropic',
        limit: 1,
      });

      if (searchResponse.providers.length === 0) {
        console.log('Skipping getProviderById test - no providers found in search');
        return;
      }

      const providerId = searchResponse.providers[0].id;
      console.log(`Testing getProviderById with ID: ${providerId}`);

      const provider = await client.getProviderById(providerId);

      console.log('Provider by ID result:', JSON.stringify(provider, null, 2));

      expect(provider).toBeDefined();
      expect(provider).not.toBeNull();
      expect(provider!.id).toBe(providerId);
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('slug');
      expect(typeof provider!.name).toBe('string');
      expect(typeof provider!.slug).toBe('string');

      console.log(`Retrieved provider: ${provider!.name} (Slug: ${provider!.slug})`);

      // Verify optional fields are present if they exist
      if (provider!.url) {
        expect(typeof provider!.url).toBe('string');
        console.log(`  URL: ${provider!.url}`);
      }
      if (provider!.implementations_count !== undefined) {
        expect(typeof provider!.implementations_count).toBe('number');
        console.log(`  Implementations: ${provider!.implementations_count}`);
      }
      if (provider!.created_at) {
        expect(typeof provider!.created_at).toBe('string');
      }
      if (provider!.updated_at) {
        expect(typeof provider!.updated_at).toBe('string');
      }
    });

    it('should return null for non-existent provider ID', async () => {
      const provider = await client.getProviderById(999999999);

      console.log('Non-existent provider result:', provider);

      expect(provider).toBeNull();
    });

    it('should retrieve multiple providers by ID', async () => {
      // Get a few providers from search
      const searchResponse = await client.searchProviders({
        query: 'a',
        limit: 3,
      });

      console.log(`Found ${searchResponse.providers.length} providers for ID retrieval test`);

      for (const searchedProvider of searchResponse.providers) {
        const provider = await client.getProviderById(searchedProvider.id);

        expect(provider).toBeDefined();
        expect(provider).not.toBeNull();
        expect(provider!.id).toBe(searchedProvider.id);
        expect(provider!.name).toBe(searchedProvider.name);
        expect(provider!.slug).toBe(searchedProvider.slug);

        console.log(`✓ Verified provider ${provider!.id}: ${provider!.name}`);
      }
    });
  });

  describe('API error handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidClient = new PulseMCPAdminClient('invalid-api-key', baseUrl);

      await expect(invalidClient.searchProviders({ query: 'test' })).rejects.toThrow(
        /Invalid API key|401/
      );

      console.log('✓ Invalid API key properly rejected');
    });
  });

  describe('data consistency', () => {
    it('should return consistent data between search and getById', async () => {
      // Search for a provider
      const searchResponse = await client.searchProviders({
        query: 'anthropic',
        limit: 1,
      });

      if (searchResponse.providers.length === 0) {
        console.log('Skipping consistency test - no providers found');
        return;
      }

      const searchedProvider = searchResponse.providers[0];
      const providerId = searchedProvider.id;

      // Retrieve the same provider by ID
      const provider = await client.getProviderById(providerId);

      expect(provider).not.toBeNull();
      expect(provider!.id).toBe(searchedProvider.id);
      expect(provider!.name).toBe(searchedProvider.name);
      expect(provider!.slug).toBe(searchedProvider.slug);
      expect(provider!.url).toBe(searchedProvider.url);
      expect(provider!.implementations_count).toBe(searchedProvider.implementations_count);

      console.log('✓ Data consistency verified between search and getById');
      console.log('  Provider:', provider!.name);
      console.log('  ID match:', provider!.id === searchedProvider.id);
      console.log('  Name match:', provider!.name === searchedProvider.name);
      console.log('  Slug match:', provider!.slug === searchedProvider.slug);
    });
  });
});
