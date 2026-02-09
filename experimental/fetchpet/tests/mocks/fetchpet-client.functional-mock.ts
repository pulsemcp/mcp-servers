import type { IFetchPetClient } from '../../shared/src/server.js';
import type {
  Claim,
  ClaimDetails,
  ClaimSubmissionData,
  ClaimSubmissionResult,
  FetchPetConfig,
} from '../../shared/src/types.js';

/**
 * Mock Fetch Pet client for functional tests
 */
export function createMockFetchPetClient(): IFetchPetClient {
  let mockToken: string | null = null;

  return {
    async initialize(): Promise<void> {
      // No-op for mock
    },

    async prepareClaimToSubmit(
      petName: string,
      invoiceDate: string,
      invoiceAmount: string,
      providerName: string,
      claimDescription: string,
      invoiceFilePath?: string,
      medicalRecordsPath?: string
    ): Promise<ClaimSubmissionData> {
      mockToken = 'test-confirmation-token-12345';
      return {
        petName,
        invoiceDate,
        invoiceAmount,
        providerName,
        claimDescription,
        invoiceFile: invoiceFilePath,
        medicalRecordsFile: medicalRecordsPath,
        isReadyToSubmit: true,
        validationErrors: [],
        confirmationMessage: `IMPORTANT: This claim has been prepared but NOT submitted yet.

To submit this claim, call submit_claim with confirmation_token: "${mockToken}"

Claim Details:
- Pet: ${petName}
- Invoice Date: ${invoiceDate}
- Amount: ${invoiceAmount}
- Provider: ${providerName}
- Description: ${claimDescription}

The user MUST explicitly confirm they want to submit this claim before calling submit_claim.`,
      };
    },

    async submitClaim(confirmationToken: string): Promise<ClaimSubmissionResult> {
      if (confirmationToken !== mockToken) {
        return {
          success: false,
          message: 'Invalid or expired confirmation token',
        };
      }
      mockToken = null;
      return {
        success: true,
        message: 'Claim submitted successfully',
        claimId: 'TEST-CLAIM-001',
        confirmationNumber: 'TEST-CONF-12345',
      };
    },

    async getClaims(): Promise<Claim[]> {
      return [
        {
          claimId: 'TEST-ACTIVE-001',
          petName: 'Buddy',
          claimDate: '2025-01-15',
          claimAmount: '$250.00',
          status: 'pending',
          description: 'Annual checkup',
          providerName: 'Test Vet Clinic',
        },
        {
          claimId: 'TEST-HIST-001',
          petName: 'Buddy',
          claimDate: '2024-12-01',
          claimAmount: '$500.00',
          status: 'approved',
          description: 'Emergency surgery',
          providerName: 'Test Emergency Vet',
        },
      ];
    },

    async getClaimDetails(claimId: string): Promise<ClaimDetails> {
      return {
        claimId,
        petName: 'Buddy',
        claimDate: '2025-01-15',
        claimAmount: '$250.00',
        status: 'pending',
        description: 'Annual checkup',
        providerName: 'Test Vet Clinic',
        reimbursementAmount: '$200.00',
        deductible: '$50.00',
        copay: '$0.00',
        eobSummary: 'Test EOB summary',
        invoiceSummary: 'Test invoice summary',
      };
    },

    async getCurrentUrl(): Promise<string> {
      return 'https://my.fetchpet.com/dashboard';
    },

    async close(): Promise<void> {
      // No-op for mock
    },

    getConfig(): FetchPetConfig {
      return {
        username: 'test@example.com',
        password: 'test-password',
        headless: true,
        timeout: 30000,
        downloadDir: '/tmp/test-downloads',
      };
    },
  };
}
