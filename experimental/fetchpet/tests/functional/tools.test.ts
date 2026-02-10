import { describe, it, expect, beforeEach } from 'vitest';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockFetchPetClient } from '../mocks/fetchpet-client.functional-mock.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { IFetchPetClient } from '../../shared/src/server.js';

describe('Fetch Pet Tools', () => {
  let mockClient: IFetchPetClient;
  let callTool: (name: string, args: unknown) => Promise<unknown>;

  beforeEach(() => {
    mockClient = createMockFetchPetClient();

    // Capture the CallToolRequest handler during registration
    let toolCallHandler:
      | ((request: { params: { name: string; arguments: unknown } }) => Promise<unknown>)
      | null = null;

    const mockServer = {
      setRequestHandler: (schema: unknown, handler: (request: unknown) => Promise<unknown>) => {
        // Check if this is the CallToolRequestSchema by comparing reference
        if (schema === CallToolRequestSchema) {
          toolCallHandler = handler as (request: {
            params: { name: string; arguments: unknown };
          }) => Promise<unknown>;
        }
      },
    };

    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer as never);

    // Create a helper to call tools
    callTool = async (name: string, args: unknown) => {
      if (!toolCallHandler) throw new Error('Tool handler not registered');
      return toolCallHandler({ params: { name, arguments: args } });
    };
  });

  describe('prepare_claim_to_submit', () => {
    it('should prepare a claim successfully', async () => {
      const result = await callTool('prepare_claim_to_submit', {
        pet_name: 'Buddy',
        invoice_date: '2025-01-15',
        invoice_amount: '$150.00',
        provider_name: 'Test Vet Clinic',
        claim_description: 'Annual checkup and vaccinations',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('IMPORTANT: This claim has been prepared but NOT submitted');
      expect(text).toContain('Buddy');
      expect(text).toContain('$150.00');
      expect(text).toContain('Test Vet Clinic');
      expect(text).toContain('confirmation_token');
    });

    it('should include file paths when provided', async () => {
      const result = await callTool('prepare_claim_to_submit', {
        pet_name: 'Luna',
        invoice_date: '2025-01-20',
        invoice_amount: '200.00',
        provider_name: 'Pet Care Center',
        claim_description: 'Dental cleaning',
        invoice_file_path: '/path/to/invoice.pdf',
        medical_records_path: '/path/to/records.pdf',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Luna');
      expect(text).toContain('Dental cleaning');
    });
  });

  describe('submit_claim', () => {
    it('should fail with invalid token', async () => {
      const result = await callTool('submit_claim', {
        confirmation_token: 'invalid-token',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Invalid or expired confirmation token');
    });

    it('should succeed with valid token after prepare', async () => {
      // First prepare a claim
      const prepareResult = await callTool('prepare_claim_to_submit', {
        pet_name: 'Buddy',
        invoice_date: '2025-01-15',
        invoice_amount: '$150.00',
        provider_name: 'Test Vet Clinic',
        claim_description: 'Annual checkup',
      });

      // Extract token from the result
      const prepareText = (prepareResult as { content: Array<{ text: string }> }).content[0].text;
      const tokenMatch = prepareText.match(/confirmation_token: "([^"]+)"/);
      expect(tokenMatch).toBeTruthy();
      const token = tokenMatch![1];

      // Submit with the token
      const submitResult = await callTool('submit_claim', {
        confirmation_token: token,
      });

      const submitText = (submitResult as { content: Array<{ text: string }> }).content[0].text;
      expect(submitText).toContain('submitted successfully');
      expect(submitText).toContain('Claim ID');
    });
  });

  describe('get_claims', () => {
    it('should return all claims (active and historical)', async () => {
      const result = await callTool('get_claims', {});

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('claim(s)');
      expect(text).toContain('Buddy');
      expect(text).toContain('pending');
      expect(text).toContain('$250.00');
      expect(text).toContain('approved');
      expect(text).toContain('$500.00');
    });
  });

  describe('get_claim_details', () => {
    it('should return claim details', async () => {
      const result = await callTool('get_claim_details', {
        claim_id: 'TEST-001',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Claim Details: TEST-001');
      expect(text).toContain('Buddy');
      expect(text).toContain('$250.00');
      expect(text).toContain('Reimbursement');
      expect(text).toContain('$200.00');
    });

    it('should include EOB and invoice summaries', async () => {
      const result = await callTool('get_claim_details', {
        claim_id: 'TEST-002',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('EOB');
      expect(text).toContain('Invoice');
    });
  });
});
