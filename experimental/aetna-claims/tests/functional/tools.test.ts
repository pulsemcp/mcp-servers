import { describe, it, expect, beforeEach } from 'vitest';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockAetnaClaimsClient } from '../mocks/aetna-claims-client.functional-mock.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { IAetnaClaimsClient } from '../../shared/src/server.js';

// Disable elicitation for functional tests so submit_claim doesn't prompt
process.env.ELICITATION_ENABLED = 'false';

describe('Aetna Claims Tools', () => {
  let mockClient: IAetnaClaimsClient;
  let callTool: (name: string, args: unknown) => Promise<unknown>;

  beforeEach(() => {
    mockClient = createMockAetnaClaimsClient();

    // Capture the CallToolRequest handler during registration
    let toolCallHandler:
      | ((request: { params: { name: string; arguments: unknown } }) => Promise<unknown>)
      | null = null;

    const mockServer = {
      setRequestHandler: (schema: unknown, handler: (request: unknown) => Promise<unknown>) => {
        if (schema === CallToolRequestSchema) {
          toolCallHandler = handler as (request: {
            params: { name: string; arguments: unknown };
          }) => Promise<unknown>;
        }
      },
    };

    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer as never);

    callTool = async (name: string, args: unknown) => {
      if (!toolCallHandler) throw new Error('Tool handler not registered');
      return toolCallHandler({ params: { name, arguments: args } });
    };
  });

  describe('submit_claim', () => {
    it('should submit a claim successfully with elicitation disabled', async () => {
      const result = await callTool('submit_claim', {
        member_name: 'Tadas Antanavicius',
        claim_type: 'Medical',
        date_of_service: '01/15/2025',
        amount_paid: '$150.00',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('submitted successfully');
      expect(text).toContain('Claim ID');
      expect(text).toContain('TEST-CLAIM-001');
    });

    it('should include confirmation number on success', async () => {
      const result = await callTool('submit_claim', {
        member_name: 'Tadas Antanavicius',
        claim_type: 'Medical',
        date_of_service: '01/15/2025',
        amount_paid: '$500.00',
        reimburse_provider: true,
        is_accident_related: true,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Confirmation Number');
      expect(text).toContain('TEST-CONF-12345');
    });
  });

  describe('get_claims', () => {
    it('should return all claims', async () => {
      const result = await callTool('get_claims', {});

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('claim(s)');
      expect(text).toContain('Tadas Antanavicius');
      expect(text).toContain('Medical');
      expect(text).toContain('$250.00');
      expect(text).toContain('Processed');
      expect(text).toContain('Pending');
    });
  });

  describe('get_claim_details', () => {
    it('should return claim details', async () => {
      const result = await callTool('get_claim_details', {
        claim_id: 'CLM-2025-001',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Claim Details: CLM-2025-001');
      expect(text).toContain('Tadas Antanavicius');
      expect(text).toContain('$250.00');
      expect(text).toContain('Amount Paid');
      expect(text).toContain('$200.00');
    });

    it('should include financial breakdown', async () => {
      const result = await callTool('get_claim_details', {
        claim_id: 'CLM-2025-002',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Financial Breakdown');
      expect(text).toContain('Deductible');
      expect(text).toContain('Copay');
    });

    it('should include EOB summary', async () => {
      const result = await callTool('get_claim_details', {
        claim_id: 'CLM-2025-003',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('EOB');
      expect(text).toContain('Test EOB summary');
    });
  });
});
