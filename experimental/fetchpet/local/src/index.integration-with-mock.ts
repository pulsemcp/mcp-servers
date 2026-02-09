#!/usr/bin/env node
/**
 * Integration test entry point that uses a mock client.
 * This allows testing MCP server functionality without actual browser automation.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from '../shared/tools.js';
import { logServerStart, logError } from '../shared/logging.js';
import type { IFetchPetClient } from '../shared/server.js';
import type {
  Claim,
  ClaimDetails,
  ClaimSubmissionData,
  ClaimSubmissionResult,
  FetchPetConfig,
} from '../shared/types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// MOCK CLIENT FOR INTEGRATION TESTS
// =============================================================================

class MockFetchPetClient implements IFetchPetClient {
  private mockToken: string | null = null;

  async initialize(): Promise<void> {
    // Mock initialization - no actual browser
  }

  async prepareClaimToSubmit(
    petName: string,
    invoiceDate: string,
    invoiceAmount: string,
    providerName: string,
    claimDescription: string,
    _invoiceFilePath?: string,
    _medicalRecordsPath?: string
  ): Promise<ClaimSubmissionData> {
    this.mockToken = 'mock-confirmation-token-12345';
    return {
      petName,
      invoiceDate,
      invoiceAmount,
      providerName,
      claimDescription,
      isReadyToSubmit: true,
      validationErrors: [],
      confirmationMessage: `IMPORTANT: This claim has been prepared but NOT submitted yet.

To submit this claim, call submit_claim with confirmation_token: "${this.mockToken}"

Claim Details:
- Pet: ${petName}
- Invoice Date: ${invoiceDate}
- Amount: ${invoiceAmount}
- Provider: ${providerName}
- Description: ${claimDescription}

The user MUST explicitly confirm they want to submit this claim before calling submit_claim.`,
    };
  }

  async submitClaim(confirmationToken: string): Promise<ClaimSubmissionResult> {
    if (confirmationToken !== this.mockToken) {
      return {
        success: false,
        message: 'Invalid or expired confirmation token',
      };
    }
    this.mockToken = null;
    return {
      success: true,
      message: 'Claim submitted successfully (mock)',
      claimId: 'MOCK-CLAIM-001',
      confirmationNumber: 'MOCK-CONF-12345',
    };
  }

  async getClaims(): Promise<Claim[]> {
    return [
      {
        claimId: 'MOCK-ACTIVE-001',
        petName: 'Buddy',
        claimDate: '2025-01-15',
        claimAmount: '$250.00',
        status: 'pending',
        description: 'Annual checkup',
        providerName: 'Mock Vet Clinic',
      },
      {
        claimId: 'MOCK-ACTIVE-002',
        petName: 'Luna',
        claimDate: '2025-01-20',
        claimAmount: '$175.50',
        status: 'processing',
        description: 'Dental cleaning',
        providerName: 'Pet Dental Care',
      },
      {
        claimId: 'MOCK-HIST-001',
        petName: 'Buddy',
        claimDate: '2024-12-01',
        claimAmount: '$500.00',
        status: 'approved',
        description: 'Emergency surgery',
        providerName: 'Emergency Vet Hospital',
      },
      {
        claimId: 'MOCK-HIST-002',
        petName: 'Luna',
        claimDate: '2024-11-15',
        claimAmount: '$85.00',
        status: 'paid',
        description: 'Vaccinations',
        providerName: 'Mock Vet Clinic',
      },
    ];
  }

  async getClaimDetails(claimId: string): Promise<ClaimDetails> {
    return {
      claimId,
      petName: 'Buddy',
      claimDate: '2025-01-15',
      claimAmount: '$250.00',
      status: 'pending',
      description: 'Annual checkup and vaccinations',
      providerName: 'Mock Vet Clinic',
      reimbursementAmount: '$200.00',
      deductible: '$50.00',
      copay: '$0.00',
      eobSummary: 'EOB available for download',
      invoiceSummary: 'Invoice available for download',
    };
  }

  async getCurrentUrl(): Promise<string> {
    return 'https://my.fetchpet.com/dashboard';
  }

  async close(): Promise<void> {
    // Mock cleanup
  }

  getConfig(): FetchPetConfig {
    return {
      username: 'mock@example.com',
      password: 'mock-password',
      headless: true,
      timeout: 30000,
      downloadDir: '/tmp/mock-downloads',
    };
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  const server = new Server(
    {
      name: 'fetchpet-mcp-server',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Create mock client
  const mockClient = new MockFetchPetClient();

  // Register tools with mock client factory
  const registerTools = createRegisterTools(
    () => mockClient,
    async () => {
      await mockClient.initialize();
      return mockClient;
    }
  );
  registerTools(server);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Fetch Pet (Mock Mode)');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
