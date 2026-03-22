import type { IAetnaClaimsClient } from '../../shared/src/server.js';
import type {
  Claim,
  ClaimDetails,
  ClaimSubmissionData,
  ClaimSubmissionResult,
  AetnaClaimsConfig,
} from '../../shared/src/types.js';

/**
 * Mock Aetna Claims client for functional tests
 */
export function createMockAetnaClaimsClient(): IAetnaClaimsClient {
  let mockToken: string | null = null;

  return {
    async initialize(): Promise<void> {
      // No-op for mock
    },

    async prepareClaimToSubmit(
      memberName: string,
      claimType: string,
      dateOfService: string,
      amountPaid: string,
      reimburseProvider: boolean,
      invoiceFilePath?: string,
      endDate?: string,
      isAccidentRelated: boolean = false,
      isEmploymentRelated: boolean = false,
      isOutsideUS: boolean = false,
      hasOtherCoverage: boolean = false
    ): Promise<ClaimSubmissionData> {
      mockToken = 'test-confirmation-token-12345';
      return {
        memberName,
        claimType,
        dateOfService,
        endDate,
        amountPaid,
        reimburseProvider,
        invoiceFile: invoiceFilePath,
        isAccidentRelated,
        isEmploymentRelated,
        isOutsideUS,
        hasOtherCoverage,
        isReadyToSubmit: true,
        validationErrors: [],
        confirmationMessage: `IMPORTANT: This claim has been prepared but NOT submitted yet.

To submit this claim, call submit_claim with confirmation_token: "${mockToken}"

Claim Details:
- Member: ${memberName}
- Type: ${claimType}
- Date of Service: ${dateOfService}${endDate ? ` to ${endDate}` : ''}
- Amount Paid: ${amountPaid}
- Reimburse Provider: ${reimburseProvider ? 'Yes' : 'No'}
- Accident Related: ${isAccidentRelated ? 'Yes' : 'No'}
- Employment Related: ${isEmploymentRelated ? 'Yes' : 'No'}
- Outside US: ${isOutsideUS ? 'Yes' : 'No'}
- Other Coverage: ${hasOtherCoverage ? 'Yes' : 'No'}

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
          claimId: 'CLM-2025-001',
          memberName: 'Tadas Antanavicius',
          claimType: 'Medical',
          dateOfService: '01/15/2025',
          claimAmount: '$250.00',
          status: 'Processed',
          providerName: 'Dr. Smith Medical Group',
          description: 'Office visit',
        },
        {
          claimId: 'CLM-2025-002',
          memberName: 'Tadas Antanavicius',
          claimType: 'Medical',
          dateOfService: '02/01/2025',
          claimAmount: '$1,200.00',
          status: 'Pending',
          providerName: 'City Hospital',
          description: 'Lab work',
        },
      ];
    },

    async getClaimDetails(claimId: string): Promise<ClaimDetails> {
      return {
        claimId,
        memberName: 'Tadas Antanavicius',
        claimType: 'Medical',
        dateOfService: '01/15/2025',
        claimAmount: '$250.00',
        status: 'Processed',
        providerName: 'Dr. Smith Medical Group',
        description: 'Office visit',
        amountBilled: '$300.00',
        amountAllowed: '$250.00',
        amountPaid: '$200.00',
        patientResponsibility: '$50.00',
        deductible: '$25.00',
        copay: '$25.00',
        coinsurance: '$0.00',
        eobSummary: 'Test EOB summary',
      };
    },

    async getCurrentUrl(): Promise<string> {
      return 'https://health.aetna.com/digital-claims';
    },

    async close(): Promise<void> {
      // No-op for mock
    },

    getConfig(): AetnaClaimsConfig {
      return {
        username: 'test-user',
        password: 'test-password',
        emailImapHost: 'imap.gmail.com',
        emailImapPort: 993,
        emailImapUser: 'test@gmail.com',
        emailImapPassword: 'test-app-password',
        headless: true,
        timeout: 30000,
        downloadDir: '/tmp/test-downloads',
      };
    },
  };
}
